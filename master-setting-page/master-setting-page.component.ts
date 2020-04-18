import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import * as moment from 'moment';
import { UploadFilesEvent } from '@alfresco/adf-content-services';
import { HttpClientService } from '../services/http-client.service';

type AOA = any[][];

export const XLSXProjectListClm = {
  projectNumber: 0,
  divisionName: 1,
  productField: 2
};

export const XLSXReviewerListClm = {
  listId: 0,
  reviewerId: 1,
  finalApproverId: 2,
  reviewerAction: 3,
  finalApproverAction: 4
};

export const XLSXDistributionListClm = {
  listId: 0,
  distributionDestId: 1
};

@Component({
  selector: 'aca-master-setting-page',
  templateUrl: './master-setting-page.component.html',
  styleUrls: ['./master-setting-page.component.scss']
})
export class MasterSettingPageComponent implements OnInit {

  /// HttpClient関連
  // レスポンスをセットするプロパティ
  public param: any = [];
  // メッセージをセットするプロパティ
  public messageInfo: any = {
    id: null,
    message: null
  };
  // メッセージを保持するリストプロパティ
  public messageInfoList: any = [this.messageInfo];
  // メッセージ登録回数
  public messageId: number = 1;
  // 入力メッセージ
  public message: string = '';

  /// Excel関連
  excelData: AOA = [];
  wopts: XLSX.WritingOptions = { bookType: 'xlsx', type: 'array' };
  fileName: string = 'MasterData.xlsx';

  // ProjectList
  projectLists: any = [];
  // ReviewerList
  reviewerLists: any = [];
  // DistributionList
  distributionLists: any = [];

  constructor(private httpClientService: HttpClientService) { }

  ngOnInit() {

    // ページ初期化
    this.initPage();

  }

  // 操作メッセージ表示
  showOperationMessage(message: String) {

    // メッセージエリア
    let messageArea = document.querySelector("#messageArea");
    // 操作メッセージ表示
    let operationMessage = document.querySelector("#operationMessage");
    operationMessage.textContent = message.toString();
    // メッセージエリアを表示
    if (message !== "") {
      messageArea.setAttribute('style', 'width:500px;height:50px');
    } else {
      messageArea.setAttribute('style', 'width:0px;height:0px');
    }

  }

  // ページ初期化
  initPage() {

    // ProjectList情報取得
    this.getProjectLists();
    // ReviewerList情報取得
    this.getReviewerLists();
    // DistributionList情報取得
    this.getDistributionLists();

  }

  // ReviewerList情報取得
  getReviewerLists() {

    // 操作メッセージ表示 初期化
    this.showOperationMessage("");

    this.httpClientService.get("reviewer_list")
      .then(
        (response) => {
          this.reviewerLists = response;
        },
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("ReviewerListの取得に失敗しました。");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("ReviewerListの取得に失敗しました。");
        }
      );

  }

  // DistributionList情報取得
  getDistributionLists() {

    // 操作メッセージ表示 初期化
    this.showOperationMessage("");

    this.httpClientService.get("distribution_list")
      .then(
        (response) => {
          this.distributionLists = response;
        },
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("DistributionListの取得に失敗しました。");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("DistributionListの取得に失敗しました。");
        }
      );

  }

  // ProjectList情報取得
  getProjectLists() {

    // 操作メッセージ表示 初期化
    this.showOperationMessage("");

    this.httpClientService.get("project_list")
      .then(
        (response) => {
          this.projectLists = response;
        },
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("ProjectListの取得に失敗しました。");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("ProjectListの取得に失敗しました。");
        }
      );

  }

  // アップロード事前処理
  onBeginUpload(event: UploadFilesEvent) {

    const files = event.files || [];

    if (files.length > 1) {
      // 操作メッセージ表示
      this.showOperationMessage("図書ファイルの複数アップロードは禁止です。アップロードを中止しました。");
      event.pauseUpload();
      return;
    }

    event.pauseUpload();

    // Excel取り込み実行
    this.executeExcelImport(event);

  }

  // Excel取り込み実行
  executeExcelImport(evt: any) {

    // File reader
    if (evt.files.length !== 1) throw new Error('Cannot use multiple files');
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      // workbook 読み込み
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      for (let cnt = 0; cnt < wb.SheetNames.length; cnt++) {
        // Frst sheet 読み込み
        const wsname: string = wb.SheetNames[cnt];
        const ws: XLSX.WorkSheet = wb.Sheets[wsname];

        // Excelデータ 格納
        this.excelData = <AOA>(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }));

        // Upsert実行
        this.executeUpsert(wsname);
      }

    };
    //    reader.readAsBinaryString(target.files[0]);
    reader.readAsBinaryString(evt.files[0].file);

  }

  // Upsert実行
  executeUpsert(wsname: string) {

    if (wsname === "ProjectList") {
      for (let cnt = 1; cnt < this.excelData.length; cnt++) {
        let rowData = this.excelData[cnt];
        const body: any = {
          projectnumber: rowData[XLSXProjectListClm.projectNumber],
          divisionname: rowData[XLSXProjectListClm.divisionName],
          productfield: rowData[XLSXProjectListClm.productField]
        };
        if (-1 !== this.projectLists.findIndex((ent) =>
          ((ent.projectnumber === rowData[XLSXProjectListClm.projectNumber]) &&
            (ent.divisionname === rowData[XLSXProjectListClm.divisionName]) &&
            (ent.docNumInternal === rowData[XLSXProjectListClm.productField])))) {
          // 既に登録済みなら更新
          this.updateProjectList(this.projectLists.listid, body);
        } else {
          // 未登録なら登録
          this.registProjectList(body);
        }
      }
    } else if (wsname === "ReviewerList") {
      for (let cnt = 1; cnt < this.excelData.length; cnt++) {
        let rowData = this.excelData[cnt];
        const body: any = {
          listid: rowData[XLSXReviewerListClm.listId],
          reviewerid: rowData[XLSXReviewerListClm.reviewerId],
          finalapproverid: rowData[XLSXReviewerListClm.finalApproverId],
          revieweraction: rowData[XLSXReviewerListClm.reviewerAction],
          finalapproveraction: rowData[XLSXReviewerListClm.finalApproverAction]
        };
        if (-1 !== this.reviewerLists.findIndex((ent) =>
          (ent.listid === rowData[XLSXReviewerListClm.listId]))) {
          // 既に登録済みなら更新
          this.updateReviewerList(this.reviewerLists.id, body);
        } else {
          // 未登録なら登録
          this.registReviewerList(body);
        }
      }
    } else if (wsname === "DistributionList") {
      for (let cnt = 1; cnt < this.excelData.length; cnt++) {
        let rowData = this.excelData[cnt];
        const body: any = {
          listid: rowData[XLSXDistributionListClm.listId],
          distributiondestid: rowData[XLSXDistributionListClm.distributionDestId]
        };
        if (-1 !== this.distributionLists.findIndex((ent) =>
          (ent.listid === rowData[XLSXDistributionListClm.listId]))) {
          // 既に登録済みなら更新
          this.updateDistributionList(this.distributionLists.id, body);
        } else {
          // 未登録なら登録
          this.registDistributionList(body);
        }
      }
    }

  }

  // ProjectList更新
  updateProjectList(listId: number, body: any) {

    this.httpClientService.update(listId, "listid", "project_list", body)
      .then(
        (response) => {
          console.debug(response);
          // 操作メッセージ表示
          this.showOperationMessage("ProjectListの更新に成功しました。");
        },
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("ProjectListの更新に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("ProjectListの更新に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      );

  }

  // ReviewerList更新
  updateReviewerList(id: number, body: any) {

    this.httpClientService.update(id, "id", "reviewer_list", body)
      .then(
        (response) => {
          console.debug(response);
          // 操作メッセージ表示
          this.showOperationMessage("ReviewerListの更新に成功しました。");
        },
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("ReviewerListの更新に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("ReviewerListの更新に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      );

  }

  // DistributionList更新
  updateDistributionList(id: number, body: any) {

    this.httpClientService.update(id, "id", "distribution_list", body)
      .then(
        (response) => {
          console.debug(response);
          // 操作メッセージ表示
          this.showOperationMessage("DistributionListの更新に成功しました。");
        },
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("DistributionListの更新に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("DistributionListの更新に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      );

  }

  // ProjectList登録
  registProjectList(body: any) {

    this.httpClientService.register("project_list", body)
      .then(
        (response) => {
          console.debug(response);
          // 操作メッセージ表示
          this.showOperationMessage("ProjectListの登録に成功しました。");
        },
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("ProjectListの登録に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("ProjectListの登録に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      );

  }

  // ReviewerList登録
  registReviewerList(body: any) {

    this.httpClientService.register("reviewer_list", body)
      .then(
        (response) => {
          console.debug(response);
          // 操作メッセージ表示
          this.showOperationMessage("ReviewerListの登録に成功しました。");
        },
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("ReviewerListの登録に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("ReviewerListの登録に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      );

  }

  // DistributionList登録
  registDistributionList(body: any) {

    this.httpClientService.register("distribution_list", body)
      .then(
        (response) => {
          console.debug(response);
          // 操作メッセージ表示
          this.showOperationMessage("DistributionListの登録に成功しました。");
        },
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("DistributionListの登録に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("DistributionListの登録に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      );

  }

  convertExcelDateToDBDate(srcDate: any): any {
    let retDate: String = null;

    if ((srcDate !== undefined) && (srcDate !== null) && (srcDate !== "")) {
      retDate = moment(srcDate).format('YYYY/MM/DD');
    }

    return retDate;
  }

}
