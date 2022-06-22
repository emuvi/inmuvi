import {
  QinButton,
  QinColumn,
  QinFilePath,
  QinLabel,
  QinLine,
  QinStack,
  QinText,
} from "qinpel-cps";

class QinScaffold extends QinStack {
  private _qinInput = new QinFilePath();
  private _qinOutput = new QinFilePath();
  private _qinMake = new QinButton({ label: new QinLabel("Make") });
  private _qinMakeLine = new QinLine({ items: [this._qinMake] });
  private _qinBody = new QinColumn({
    items: [this._qinInput, this._qinOutput, this._qinMakeLine],
  });

  private _qinText = new QinText();
  private _qinBack = new QinButton({ label: new QinLabel("Back") });
  private _qinBackLine = new QinLine({ items: [this._qinBack] });
  private _qinView = new QinColumn({
    items: [this._qinText, this._qinBackLine],
  });

  public constructor() {
    super();
    this._qinView.install(this);
    this._qinBody.install(this);
    this._qinText.style.putAsFlexMax();
    this._qinView.style.putAsFlexMax();
    this._qinView.style.putAsAlignItemsStretch();
    this._qinMake.addActionMain((_) => this.actMake());
    this._qinBack.addActionMain((_) => this.actBack());
  }

  private actMake() {
    this.show(this._qinView);
    const input = this._qinInput.value;
    const output = this._qinOutput.value;
    this._qinText.appendLine("Starting Inmuvi...");
    this._qinText.appendLine("Input: " + input);
    this._qinText.appendLine("Output: " + output);
  }

  private actBack() {
    this.show(this._qinBody);
  }
}

new QinScaffold().style.putAsBody();
