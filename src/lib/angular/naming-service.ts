import { UiDocument } from '../schema/ui-schema';
import { NamingService } from './renderer-contract';

export class AngularNamingService implements NamingService {
  componentSelector(doc: UiDocument): string {
    return `app-${doc.name}`;
  }

  templateUrl(doc: UiDocument): string {
    return `./${doc.name}.component.html`;
  }

  styleUrl(doc: UiDocument): string {
    return `./${doc.name}.component.scss`;
  }
}
