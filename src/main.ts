import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { defineReIcon } from './app/lib/reicon';

// Register re-icon custom element before bootstrapping the Angular app
defineReIcon();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
