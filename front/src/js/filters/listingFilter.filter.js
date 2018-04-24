(function(){
    angular.module('frodo').filter('listingFilter', ListingFilter);

    ListingFilter.$inject = ['$filter'];

    function ListingFilter($filter){

        return function(models, filters, type){
            if(!models.length){
                return models;
            }

            // textFilter
            models = $filter('filter')(models, filters.textFilter.value);

            if(type !== 'posts'){
                return models;
            }

            // checkboxes
            if(filters.checkboxes.fields.length){
                filters.checkboxes.fields.forEach(function(checkbox){
                    if(checkbox.value !== 'all'){
                        models = models.filter(function(model){
                            return model.data[checkbox.id] === checkbox.value;
                        })
                    }
                })
            }

            // selects
            if(filters.selects.fields.length){
                filters.selects.fields.forEach(function(select){
                    if(select.values.length){
                        models = models.filter(function(model){
                            return select.values.indexOf(model.data[select.id]) > -1;
                        })
                    }
                })
            }

            // catalogues
            if(filters.catalogues.fields.length){
                filters.catalogues.fields.forEach(function(catalogue){
                    if(catalogue.values.length){
                        models = models.filter(function(model){
                            return catalogue.values.indexOf(model.data[catalogue.id]) > -1;
                        })
                    }
                })
            }

            // numbers
            if(filters.numbers.fields.length){
                filters.numbers.fields.forEach(function(number){
                    if(number.minValue !== number.range[0] || number.maxValue !== number.range[1]){
                        models = models.filter(function(model){
                            return ((number.minValue <= model.data[number.id]) && (number.maxValue >= model.data[number.id]));
                        })
                    }
                })
            }

            // dates
            if(filters.dates.fields.length){
                filters.dates.fields.forEach(function(date){
                    if(date.minValue !== date.range[0] || date.maxValue !== date.range[1]){
                        models = models.filter(function(model){
                            return (model.data[date.id] && (date.minValue.getTime() <= (new Date(model.data[date.id])).getTime()) && (date.maxValue.getTime() >= (new Date(model.data[date.id])).getTime()));
                        })
                    }
                })
            }

            return models
        }

    }

})();