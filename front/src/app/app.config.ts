import {
    ApplicationConfig,
    inject,
    provideAppInitializer,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { catchError, firstValueFrom, of } from 'rxjs';

import { routes } from './app.routes';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { UserService } from './core/user.service';
import { FilesService } from './core/files.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideAnimations(),
        // init.run.js: load the current session user before the app renders; FilesService
        // then loads the file catalogues in the background once someone is logged in
        provideAppInitializer(() => {
            const userService = inject(UserService);
            inject(FilesService);
            return firstValueFrom(userService.fetchUser().pipe(catchError(() => of(null))));
        }),
    ],
};
