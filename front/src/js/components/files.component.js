(function () {
    angular.module('frodo').component('files', {
        templateUrl: 'html/components/files.html',
        controllerAs: 'vm',
        bindings: {
            allFiles: '<',
            isPopup: '<'
        },
        controller: FilesController
    });

    FilesController.$inject = ['$scope', 'filesService', '$rootScope', '$mdDialog', 'tools', '$mdMedia', '$mdSidenav', '$timeout'];

    function FilesController($scope, filesService, $rootScope, $mdDialog, tools, $mdMedia, $mdSidenav, $timeout) {
        var vm = this;
        vm.$onInit = onInit;
        vm.$mdMedia = $mdMedia;
        vm.upload = upload;
        vm.onFilesSelect = onFilesSelect;
        vm.editIndex = editIndex;
        vm.removeFile = removeFile;
        vm.deleteFile = deleteFile;
        vm.deleteDialog = deleteDialog;
        vm.saveFile = saveFile;
        vm.chooseFile = chooseFile;
        vm.existingFilesIndex = existingFilesIndex;
        vm.incrementLimit = incrementLimit;
        vm.openEdit = openEdit;
        vm.importFiles = importFiles;
        vm.exportFiles = exportFiles;
        vm.addNewCatalogue = addNewCatalogue;
        vm.activeView = 'choose';
        vm.catalogues = [];
        vm.data = [];
        vm.currentExistingIndex = 0;
        vm.actionStatus = '';
        vm.newCatalogue = '';
        vm.limit = 80;
        var increment = 40;
        vm.search = {text: '', catalogues: []};
        var exportTimeout;

        function onInit(){
            if(!vm.allFiles){
                vm.loadingFiles = true;
                filesService.getAllFiles()
                    .then(function(response){
                        vm.loadingFiles = false;
                        vm.allFiles = response.data;
                        setCatalogues(vm.allFiles);
                        setDates();
                        setLocalId();
                    })
                    .catch(function(error){
                        vm.loadingFiles = false;
                    })
            } else {
                vm.allFiles = vm.allFiles.data;
                setCatalogues(vm.allFiles);
                setDates();
                setLocalId();
            }

            $scope.$on('filesFiltered', function(ev, i, l){
                if(vm.currentFilterLength !== l){
                    vm.currentExistingIndex = i;
                    vm.currentFilterLength = l;
                }
            })
        }

        function setDates(){
            vm.allFiles.forEach(function(file){
                file.date = new Date(file.date);

                if(isNaN(file.date.getTime())){
                    file.date = null;
                }
            })
        }

        function setLocalId(){
            var i = 0;
            for(i; i < vm.allFiles.length; i++){
                vm.allFiles[i].localId = i;
            }
        }

        function setCatalogues(arr){
            var catalogues = [];
            arr.forEach(function(fileData){
                if(fileData.catalogue){
                    var catalogue = fileData.catalogue.toLowerCase();
                    if(vm.catalogues.indexOf(catalogue) === -1 && catalogues.indexOf(catalogue) === -1){
                        catalogues.push(catalogue);
                    }
                }
            });
            vm.catalogues = vm.catalogues.concat(catalogues).sort();
            filesService.setCatalogues(vm.catalogues);
        }

        function editIndex(index) {
            vm.currentIndex = index;
            setCatalogues(vm.data);
        }

        function existingFilesIndex(index){
            vm.currentExistingIndex = index;
            setCatalogues(vm.allFiles);
            if($mdMedia('xs') || $mdMedia('sm')){
                openEdit();
            }
        }

        function onFilesSelect() {
            vm.data = new Array(vm.files.length);
            var i = 0;
            for(i; i < vm.data.length; i++){
                vm.data[i] = {date: null, isOpen: false};
            }
            vm.currentIndex = 0;
            vm.data[0].isOpen = true;
        }

        function removeFile(i) {
            vm.files.splice(i, 1);
            vm.data.splice(i, 1);
            vm.currentIndex = 0;
        }

        function upload(ev) {

            var data = {};

            vm.data.forEach(function(fileData, i){
                data[i] = fileData;
            });
            if (vm.files.length) {
                vm.actionStatus = 'upload';
                filesService.upload(vm.files, data)
                    .then(function (response) {
                        vm.actionStatus = '';
                        if(response.data.length){
                            vm.allFiles = vm.allFiles.concat(response.data);
                            setLocalId();
                            setDates();
                            setCatalogues(vm.allFiles);
                            vm.data = [];
                            vm.files = [];
                            tools.infoDialog('Files uploaded successfully', ev);
                            vm.activeView = 'choose';
                        }
                    }, function(resp){}, function(evt){
                        vm.progress = parseInt(100.0 * evt.loaded / evt.total);
                    })
                    .catch(function (e) {
                        vm.actionStatus = '';
                        tools.infoDialog(e.data.error || e.data, ev);
                    })
            }
        }

        function chooseFile(){
            $mdDialog.hide(vm.allFiles[vm.currentExistingIndex]);
        }

        function deleteFile(ev){
            vm.actionStatus = 'delete';
            filesService.remove(vm.allFiles[vm.currentExistingIndex]._id)
                .then(function(r){
                    vm.actionStatus = '';
                    tools.infoDialog(vm.allFiles[vm.currentExistingIndex].filename + ' removed successfully', ev);
                    vm.allFiles.splice(vm.currentExistingIndex, 1);
                    setLocalId();
                })
                .catch(function(e){
                    vm.actionStatus = '';
                    tools.infoDialog(e.data.error || e.data, ev);
                })
        }

        function deleteDialog(ev){
            tools.removeDialog(ev, deleteFile, 'Are you sure you want to delete ' + vm.allFiles[vm.currentExistingIndex].filename);
        }

        function saveFile(ev){
            vm.actionStatus = 'save';
            filesService.edit(vm.allFiles[vm.currentExistingIndex])
                .then(function(r){
                    vm.actionStatus = '';
                    setCatalogues(vm.allFiles);
                    tools.infoDialog(vm.allFiles[vm.currentExistingIndex].filename + ' saved successfully', ev);
                })
                .catch(function(e){
                    vm.actionStatus = '';
                    tools.infoDialog(e.data.error || e.data, ev);
                })
        }

        function incrementLimit(){
            if(vm.allFiles.length > vm.limit){
                vm.limit += increment;
                $scope.$apply();
            }
            if(vm.limit >= vm.allFiles.length){
                $rootScope.$broadcast('loadFinished');
            }
        }

        function openEdit(){
            $mdSidenav('editFiles').open();
        }

        function importFiles(e){
            var reader = new FileReader();
            var oldLength = vm.allFiles.length;
            reader.onload = function(e){
                var files = JSON.parse(e.target.result);

                if(files.length){
                    var data = {
                        files: files
                    };
                    vm.importStatus = true;
                    filesService.importFiles(data)
                        .then(function(response){
                            vm.importStatus = false;
                            var added = response.data.length - oldLength;
                            vm.allFiles = response.data;
                            tools.infoDialog(added + ' files' + (added > 1 ? ' were' : ' was') + ' successfully imported', vm.importClickEvent);
                        })
                        .catch(function(error){
                            vm.importStatus = false;
                            tools.infoDialog(error.data.error, vm.importClickEvent);
                        })
                } else {
                    tools.infoDialog("There is no correct files to import", e);
                }
            };

            if(e.target.files && e.target.files[0]){
                var error = e.target.files[0].$error;
                if(error){
                    if(error === 'pattern'){
                        tools.infoDialog("Wrong file format!", vm.importClickEvent);
                    }
                } else {
                    reader.readAsText(e.target.files[0]);
                }
            }
        }

        function exportFiles(e){
            $timeout.cancel(exportTimeout);
            vm.exportStatus = true;
            filesService.exportFiles()
                .then(function(response){
                    vm.exportStatus = false;
                    var file = document.createElement("a");
                    file.setAttribute('href', response.data);
                    file.setAttribute('download', '');
                    file.click();
                    exportTimeout = $timeout(function(){
                        filesService.deleteExportFile('files')
                            .then(function(response){
                                console.log(response);
                            })
                            .catch(function(error){
                                console.log(error);
                            })
                    }, 10000);
                })
                .catch(function(error){
                    vm.exportStatus = false;
                    tools.infoDialog("There was error exporting", e);
                })
        }

        function addNewCatalogue(){
            if(vm.newCatalogue){
                var catalogue = vm.newCatalogue.toLowerCase();
                vm.newCatalogue = '';
                if(vm.catalogues.indexOf(catalogue) === -1){
                    vm.catalogues.push(catalogue);
                    vm.catalogues = vm.catalogues.sort();
                    filesService.setCatalogues(vm.catalogues);
                }
            }
        }

    }
})();