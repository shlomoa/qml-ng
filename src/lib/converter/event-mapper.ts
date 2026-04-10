import { UiEvent } from '../schema/ui-schema';

const QML_TO_ANGULAR_EVENT: Record<string, string> = {
  onClicked: 'click',
  onTextChanged: 'input',
  onPressed: 'mousedown'
};

export function mapQmlHandler(name: string, handler: string): UiEvent {
  return {
    name,
    angularEvent: QML_TO_ANGULAR_EVENT[name] ?? name,
    handler
  };
}

export function isQmlHandlerName(name: string): boolean {
  return /^on[A-Z]/.test(name);
}
