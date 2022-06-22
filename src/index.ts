import { QinColumn, QinLabel } from "qinpel-cps";

class QinScaffold extends QinColumn {
  private _qinLabel = new QinLabel("Inmuvi");
  public constructor() {
    super();
    this._qinLabel.install(this);
  }
}

new QinScaffold().style.putAsBody();
