import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import * as moment from 'moment';
import { UploadFilesEvent } from '@alfresco/adf-content-services';
import { HttpClientService } from '../services/http-client.service';

type AOA = any[][];

export const XLSXClm = {
  projectNumber: 0,
  projectName: 1,
  departInCharge: 2,
  docNumInternal: 3,
  documentName: 4,
  docNumCustomer: 5,
  docNumVendor: 6,
  documentClass: 7,
  wbsNumber: 8,
  wbsName: 9,
  personInChargeNum: 10,
  issueReqCustomer: 11,
  issueReqVendor: 12,
  //  initPlan: 13,
  //  initSchedule: 14,
  //  intAppPlan: 15,
  //  intAppSchedule: 16,
  //  cstSubPlan: 17,
  //  cstSubSchedule: 18,
  //  cstAppPlan: 19,
  //  cstAppSchedule: 20,
  //  asBuiltPlan: 21,
  //  asBuiltSchedule: 22
  issueName1: 13,
  planDate1: 14,
  scheduleDate1: 15,
  issueName2: 16,
  planDate2: 17,
  scheduleDate2: 18,
  issueName3: 19,
  planDate3: 20,
  scheduleDate3: 21,
  issueName4: 22,
  planDate4: 23,
  scheduleDate4: 24,
  issueName5: 25,
  planDate5: 26,
  scheduleDate5: 27,
  issueName6: 28,
  planDate6: 29,
  scheduleDate6: 30,
  issueName7: 31,
  planDate7: 32,
  scheduleDate7: 33
};

export declare class IssueScheduleExListModel {
  listId: number;
  issueName1: string;
  planDate1: string;
  scheduleDate1: string;
  actualDate1: string;
  issueName2: string;
  planDate2: string;
  scheduleDate2: string;
  actualDate2: string;
  issueName3: string;
  planDate3: string;
  scheduleDate3: string;
  actualDate3: string;
  issueName4: string;
  planDate4: string;
  scheduleDate4: string;
  actualDate4: string;
  issueName5: string;
  planDate5: string;
  scheduleDate5: string;
  actualDate5: string;
  issueName6: string;
  planDate6: string;
  scheduleDate6: string;
  actualDate6: string;
  issueName7: string;
  planDate7: string;
  scheduleDate7: string;
  actualDate7: string;
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
  fileName: string = 'MasterList.xlsx';

  // MasterList
  masterLists = [];
  // IssueScheduleList
  //  issueScheduleLists = [];
  // IssueScheduleExList
  issueScheduleExLists = [];

  constructor(private httpClientService: HttpClientService) { }

  ngOnInit() {
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
    //  const target: DataTransfer = <DataTransfer>(evt.target);
    //  if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    if (evt.files.length !== 1) throw new Error('Cannot use multiple files');
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      // workbook 読み込み
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      // Frst sheet 読み込み
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      // Excelデータ 格納
      this.excelData = <AOA>(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }));

      // Excelデータ表示
      //      this.showExcelData();

      // 表示データ(ShowData)登録実行
      //      this.executeRegister();

    };
    //    reader.readAsBinaryString(target.files[0]);
    reader.readAsBinaryString(evt.files[0].file);

  }

  // IssueScheduleExList情報取得
  getIssueScheduleExLists() {

    // 操作メッセージ表示 初期化
    this.showOperationMessage("");

    this.httpClientService.get("issue_schedule_ex_list")
      .then(
        (response) => {
          this.issueScheduleExLists = response;
          this.messageInfoList = this.param.messages;
        },
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("IssueScheduleExListの取得に失敗しました。");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("IssueScheduleExListの取得に失敗しました。");
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
