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
    this.step1CallFreezeDetection({ input, output });
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
        process.issuedDetection = token;
        this.step2ParseFreezeDetected(process);
      })
      .catch((err) => {
        this._qinText.appendLine("Error on Start: " + err.message);
      });
  }

  private step2ParseFreezeDetected(process: Process) {
    this.qinpel.talk.issued
      .askWhenDone({
        token: process.issuedDetection,
        askResultLines: true,
      })
      .then((res) => {
        const freezes = new Array<Freezed>();
        if (res.resultLines) {
          let freezeStart = -1;
          for (let line of res.resultLines) {
            line = line.toLowerCase();
            if (line.startsWith("[freezedetect @")) {
              let posStart = line.indexOf(".freeze_start:");
              if (posStart > -1) {
                let freezeStartStr = line.substring(posStart + 14).trim();
                this._qinText.appendLine("Detected Freeze Start: " + freezeStartStr);
                freezeStart = +freezeStartStr;
              } else {
                let posEnd = line.indexOf(".freeze_end:");
                if (posEnd > -1) {
                  let freezeEndStr = line.substring(posEnd + 12).trim();
                  this._qinText.appendLine("Detected Freeze End: " + freezeEndStr);
                  let freezeEnd = +freezeEndStr;
                  if (freezeStart == -1) {
                    this._qinText.appendLine(
                      "Error: Detected freeze end without a freeze start."
                    );
                  } else {
                    freezes.push({ freezeStart, freezeEnd });
                  }
                }
              }
            }
          }
        }
        process.detectedFreezes = freezes;
        this.step3StripFreezes(process);
      })
      .catch((err) => {
        this._qinText.appendLine("Error on Show: " + err.message);
      });
  }

  private step3StripFreezes(process: Process) {
    if (!(process?.detectedFreezes?.length > 0)) {
      this._qinText.appendLine("There is no freezes to be stripped.");
      return;
    }
    let filterParts = new Array<string>();
    for (let i = 0; i < process.detectedFreezes.length; i++) {
      const actual = process.detectedFreezes[i];
      if (i == 0) {
        filterParts.push(`[0:v]trim=duration=${actual.freezeStart}[c0v];`);
        filterParts.push(`[0:a]atrim=duration=${actual.freezeStart}[c0a];`);
      } else {
        const previous = process.detectedFreezes[i - 1];
        filterParts.push(
          `[0:v]trim=start=${previous.freezeEnd}:end=${actual.freezeStart},setpts=PTS-STARTPTS[p${i}v];`
        );
        filterParts.push(
          `[0:a]atrim=start=${previous.freezeEnd}:end=${actual.freezeStart},asetpts=PTS-STARTPTS[p${i}a];`
        );
        filterParts.push(`[c${i - 1}v][p${i}v]concat[c${i}v];`);
        filterParts.push(`[c${i - 1}a][p${i}a]concat=v=0:a=1[c${i}a];`);
        if (i == process.detectedFreezes.length - 1) {
          filterParts.push(`[0:v]trim=start=${actual.freezeEnd},setpts=PTS-STARTPTS[lv];`);
          filterParts.push(`[0:a]atrim=start=${actual.freezeEnd},asetpts=PTS-STARTPTS[la];`);
          filterParts.push(`[c${i}v][lv]concat[outv];`);
          filterParts.push(`[c${i}a][la]concat=v=0:a=1[outa]`);
        }
      }
    }
    this._qinText.appendLine("Constructed filter:");
    let filterComplex = "";
    for (let line of filterParts) {
      if (filterComplex) {
        filterComplex += " ";
      }
      filterComplex += line;
      this._qinText.appendLine(line);
    }
    this._qinText.appendLine(filterComplex);
    this.qinpel.talk.cmd
      .run({
        exec: "ffmpeg",
        args: [
          "-i",
          process.input,
          "-filter_complex",
          filterComplex,
          "-map",
          "[outv]",
          "-map",
          "[outa]",
          process.output,
        ],
      })
      .then((token) => {
        process.issuedStripping = token;
        this.step4FinalShow(process);
      })
      .catch((err) => {
        this._qinText.appendLine(err);
      });
  }

  private step4FinalShow(process: Process) {
    this.qinpel.talk.issued
      .askWhenDone({
        token: process.issuedStripping,
        askResultLines: true,
      })
      .then((res) => {
        this._qinText.appendLine("Finished");
        for (let line of res.resultLines) {
          this._qinText.appendLine(line);
        }
      })
      .catch((err) => {
        this._qinText.appendLine(err);
      });
  }
}

type Process = {
  input: string;
  output: string;
  issuedDetection?: string;
  detectedFreezes?: Freezed[];
  issuedStripping?: string;
};

type Freezed = {
  freezeStart: number;
  freezeEnd: number;
};

new Inmuvi().style.putAsBody();
