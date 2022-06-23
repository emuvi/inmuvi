import {
  QinButton,
  QinColumn,
  QinFilePath,
  QinLabel,
  QinLine,
  QinStack,
  QinText,
} from "qinpel-cps";

class Inmuvi extends QinStack {
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
    this.step1CallFreezeDetection({ input, output, tokens: new Map() });
  }

  private actBack() {
    this.show(this._qinBody);
  }

  private step1CallFreezeDetection(process: Process) {
    this.qinpel.talk.cmd
      .run({
        exec: "ffmpeg",
        args: [
          "-i",
          process.input,
          "-vf",
          "freezedetect=n=0.001:d=1",
          "-map",
          "0:v:0",
          "-f",
          "null",
          "-",
        ],
      })
      .then((token) => {
        this._qinText.appendLine("Started on: " + token);
        process.tokens["FreezeDetection"] = token;
        this.step2ParseFreezeDetected(process);
      })
      .catch((err) => {
        this._qinText.appendLine("Error on Start: " + err.message);
      });
  }

  private step2ParseFreezeDetected(process: Process) {
    this.qinpel.talk.issued
      .askWhenDone({
        token: process.tokens["FreezeDetection"],
        askResultLines: true,
      })
      .then((res) => {
        if (res.resultLines) {
          for (let line of res.resultLines) {
            line = line.toLowerCase();
            if (line.startsWith("[freezedetect @")) {
              let posStart = line.indexOf(".freeze_start:");
              if (posStart > -1) {
                let freezeStart = line.substring(posStart + 14).trim();
                this._qinText.appendLine("Freeze Start: " + freezeStart);
              } else {
                let posEnd = line.indexOf(".freeze_end:");
                if (posEnd > -1) {
                  let freezeEnd = line.substring(posEnd + 12).trim();
                  this._qinText.appendLine("Freeze End: " + freezeEnd);
                }
              }
            }
          }
        }
      })
      .catch((err) => {
        this._qinText.appendLine("Error on Show: " + err.message);
      });
  }
}

type Process = {
  input: string;
  output: string;
  tokens: Map<string, string>;
};

new Inmuvi().style.putAsBody();
