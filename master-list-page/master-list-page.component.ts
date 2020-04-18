import { Component, OnInit } from '@angular/core';
import {
  ObjectDataTableAdapter, ObjectDataRow,
  DataCellEvent, DataRowActionEvent,
  AlfrescoApiService, EcmUserService, EcmUserModel
} from '@alfresco/adf-core';
import { PageComponent } from '../components/page.component';
import { Store } from '@ngrx/store';
import { AppExtensionService } from '../extensions/extension.service';
import { ContentManagementService } from '../services/content-management.service';
import { UploadService } from '@alfresco/adf-core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime } from 'rxjs/operators';
import { MinimalNodeEntity } from '@alfresco/js-api';
import { MatDialog } from '@angular/material';
import { ProcessStartDialogComponent } from '../process-start-dialog/process-start-dialog.component';
import {
  ViewNodeAction
} from '@alfresco/aca-shared/store';
import { HttpClientService } from '../services/http-client.service';
import { ModelConverterService } from '../services/model-converter.service';

export declare class MasterListModel {
  listId: number;
  unRead: string;
  action: string;
  dueAt: string;
  projectName: string;
  docNumInternal: string;
  documentName: string;
  documentFile: string;
  documentFileId: string;
  personInChargeNum: string;
};

export declare class ReviewerListModel {
  listId: string;
  reviewerId: string;
  finalApproverId: string;
};

@Component({
  selector: 'aca-master-list-page',
  templateUrl: './master-list-page.component.html',
  styleUrls: ['./master-list-page.component.scss']
})
export class MasterListPageComponent extends PageComponent implements OnInit {

  // PageComponent用
  isSmallScreen = false;
  columns: any[] = [];

  // アラートの押されたボタンの結果格納用
  //  alertDialogResult = '';

  // MasterList
  masterLists = [];
  // IssueScheduleList
  issueScheduleLists = [];
  // IssueScheduleExList
  issueScheduleExLists = [];
  // ReviewerList
  reviewerLists = [];
  // DistributionList
  distributionLists = [];

  // 未読 検索文字列
  unReadSearchStr: String;
  // アクション 検索文字列
  actionSearchStr: String;
  // 期限 検索文字列
  dueAtSearchStr: String;
  // プロジェクト名 検索文字列
  projectNameSearchStr: String;
  // 図書番号(社内管理番号) 検索文字列
  docNumInternalSearchStr: String;
  // 図書名 検索文字列
  documentNameSearchStr: String;
  // 図書ファイル 検索文字列
  documentFileSearchStr: String;

  // データ表示
  data = new ObjectDataTableAdapter([], []);

  // アクション除外リスト
  actionExclusionLists = [];

  // 現在画面
  currentPage = "master-list-page";

  // ログインユーザ
  loginUser: EcmUserModel = null;

  constructor(
    store: Store<any>,
    extensions: AppExtensionService,
    content: ContentManagementService,
    protected uploadService: UploadService,
    protected breakpointObserver: BreakpointObserver,
    protected route: ActivatedRoute,
    protected router: Router,
    protected apiService: AlfrescoApiService,
    protected userService: EcmUserService,
    protected httpClientService: HttpClientService,
    protected modelConvService: ModelConverterService,
    public matDialog: MatDialog
  ) {
    super(store, extensions, content);
  }

  ngOnInit() {
    super.ngOnInit();

    this.subscriptions = this.subscriptions.concat([
      this.content.linksUnshared
        .pipe(debounceTime(300))
        .subscribe(() => this.reload()),

      this.uploadService.fileUploadComplete
        .pipe(debounceTime(300))
        .subscribe(_ => this.reload()),
      this.uploadService.fileUploadDeleted
        .pipe(debounceTime(300))
        .subscribe(_ => this.reload()),

      this.breakpointObserver
        .observe([Breakpoints.HandsetPortrait, Breakpoints.HandsetLandscape])
        .subscribe(result => {
          this.isSmallScreen = result.matches;
        })
    ]);

    this.columns = this.extensions.documentListPresets.shared || [];

    // 選択リストIDを初期化
    localStorage.setItem('currentListId', '-1');
    // 返却ページIDを初期化
    localStorage.setItem('returnPageId', '');

    let chkDBData = document.querySelector("#chkDBData");
    if (localStorage.getItem('listDataType') === "DBData") {
      // DB 全リスト初期化
      this.initAllListForDB();
      chkDBData.setAttribute('checked', 'checked');
      // データタイプ設定
      localStorage.setItem('listDataType', 'DBData');
    } else {
      // 全リスト初期化
      this.initAllList();
      chkDBData.setAttribute('checked', '');
      // データタイプ設定
      localStorage.setItem('listDataType', 'JsonData');
    }

  }

  // タスク数表示
  showTaskCounter(masterToDoCount: number) {

    // Master to Do Counter設定
    let masterToDoCounter: any = document.querySelector("#masterToDoCounter");
    masterToDoCounter.value = String(masterToDoCount);

    // Task to Do Counter設定
    let taskToDoCount = 0;
    // LoginUserIdがreviewerIdあるいはfinalApproverIdに含まれる場合を抽出
    let reviewerListArray = this.reviewerLists.filter((ent) => ((ent.reviewerId.indexOf(this.loginUser.id) !== -1) || (ent.finalApproverId === this.loginUser.id)));
    for (let cnt = 0; cnt < reviewerListArray.length; cnt++) {
      let reviewerIdArray = reviewerListArray[cnt].reviewerId.split(",");
      // LoginUserIdがreviewerIdに含まれる場合
      let reviewerIdIndex = reviewerIdArray.findIndex((ent) => ent === this.loginUser.id);
      if (reviewerIdIndex !== -1) {
        // そのreviewerActionが"承認済み"ではない場合
        if (reviewerListArray[cnt].reviewerAction[reviewerIdIndex].indexOf("承認済み") === -1) {
          // MasterListが使用かつReviewerList IDの図書番号かつアクションが承認待ちの場合
          if (-1 !== this.masterLists.findIndex((ent) => ((ent.deleteFlag === "0") && (ent.docNumInternal === reviewerListArray[cnt].listId) && (ent.action.indexOf("承認待ち") !== -1)))) {
            taskToDoCount++;
          }
        }
      } else {
        // LoginUserIdがfinalApproverIdと同じ場合
        if (reviewerListArray[cnt].finalApproverId === this.loginUser.id) {
          // そのfinalApproverActionが"承認済み"ではない場合
          if (reviewerListArray[cnt].finalApproverAction.indexOf("承認済み") === -1) {
            // MasterListが使用かつReviewerList IDの図書番号かつアクションが承認待ちの場合
            if (-1 !== this.masterLists.findIndex((ent) => ((ent.deleteFlag === "0") && (ent.docNumInternal === reviewerListArray[cnt].listId) && (ent.action.indexOf("承認待ち") !== -1)))) {
              taskToDoCount++;
            }
          }
        }
      }
    }
    // Task to Do Counter表示
    let taskToDoCounter: any = document.querySelector("#taskToDoCounter");
    taskToDoCounter.value = String(taskToDoCount);

    // Notification to Do Counter設定
    let notificationToDoCount = 0;
    // 現在日付
    let nowDate = new Date();
    // 7日前日付
    let beforeDate = (new Date()).setDate(nowDate.getDate() - 7);
    // LoginUserIdがdistributionDestIdに含まれる場合を抽出
    let distributionListArray = this.distributionLists.filter((ent) => (ent.distributionDestId.indexOf(this.loginUser.id) !== -1));
    for (let cnt = 0; cnt < distributionListArray.length; cnt++) {
      // MasterListが使用かつDistributionList IDの図書番号の場合
      let masterList: any = this.masterLists.find((ent) => ((ent.deleteFlag === "0") && (ent.finalApprovalDate !== null) && (ent.finalApprovalDate !== undefined) && (ent.finalApprovalDate !== "") && (ent.docNumInternal === distributionListArray[cnt].listId)));
      if (masterList !== undefined) {
        let finalApprovalDate = masterList.finalApprovalDate;
        if ((((beforeDate.valueOf()) < (new Date(finalApprovalDate)).valueOf()) &&
          ((new Date(finalApprovalDate)).valueOf() <= nowDate.valueOf())
        )) {
          // 最終承認日が現在より7日前まではカウント
          notificationToDoCount++;
        }
      }
    }
    // Notification to Do Counter表示
    let notificationToDoCounter: any = document.querySelector("#notificationToDoCounter");
    notificationToDoCounter.value = String(notificationToDoCount);

  }

  // 全リスト初期化
  initAllList() {

    // 発行スケジュールリスト初期化
    //    this.initIssueScheduleList();
    // 拡張発行スケジュールリスト初期化
    this.initIssueScheduleExList();
    // レビューアリスト初期化
    this.initReviewerList();
    // 配布先リスト初期化
    this.initDistributionList();
    // マスターリスト初期化
    this.initMasterList();

  }

  // DB全リスト初期化
  initAllListForDB() {

    // 拡張発行スケジュールリスト初期化
    this.initIssueScheduleExListForDB();
    // レビューアリスト初期化
    this.initReviewerListForDB();
    // 配布先リスト初期化
    this.initDistributionListForDB();
    // マスターリスト初期化
    this.initMasterListForDB();

  }

  // 操作メッセージ表示
  showOperationMessage(message: String) {

    // メッセージエリア
    let messageArea = document.querySelector("#messageArea");
    // 操作メッセージ表示
    let operationMessage = document.querySelector("#operationMessage");
    operationMessage.textContent = message.toString();
    // メッセージエリアを表示
    messageArea.setAttribute('style', 'width:500px;height:50px');

  }

  preview(node: MinimalNodeEntity) {
    this.showPreview(node);
  }

  onRowClick(event: any) {
    // 選択リストIDをストレージに設定
    localStorage.setItem('currentListId', event.value.obj.listId);
    // 返却ページIDをストレージに設定
    localStorage.setItem('returnPageId', 'MasterListPage');

    // 図書詳細画面を表示
    if (event.value.obj.action.indexOf("承認待ち") === -1) {
      // 操作メッセージ表示
      this.showOperationMessage("");
      // 承認待ち以外は表示可
      this.showDocumentDetailPage();
    } else {
      // 操作メッセージ表示
      this.showOperationMessage("承認待ちの場合は詳細表示不可です。");
    }
  }

  onShowRowContextMenu(event: DataCellEvent) {
    event.value.actions = [
      {
        title: 'タスク開始1',
        // Put here your custom metadata.
      }
    ];
  }

  onShowRowActionsMenu(event: DataCellEvent) {
    event.value.actions = [
      //      {
      //        title: 'プロセス開始',
      //        // Put here your custom metadata.
      //      },
      {
        title: '図書ファイル表示',
        // Put here your custom metadata.
      }
    ];
  }

  onExecuteRowAction(event: DataRowActionEvent) {

    // 操作メッセージ初期化
    this.showOperationMessage("");
    if (event.value.action.title === "プロセス開始") {
      if ((this.getCurrentAction(event.value.row.obj.listId).indexOf("登録待ち") !== -1) ||
        (this.getCurrentAction(event.value.row.obj.listId).indexOf("申請待ち") !== -1)) {

        // レビューア情報取得
        let reviewerListModel =
          this.getReviewerInfo(event.value.row.obj.listId);

        // ダイアログの表示
        let dialog = this.matDialog.open(ProcessStartDialogComponent, {
          'data': {
            'execute': false,
            'title': 'プロセス開始',
            'message': 'プロセスを開始します。',
            'reviewer': reviewerListModel.reviewerId,
            'dueDate': new Date()
          },
          'height': '800px',
          'width': '700px',
          'disableClose': false
        });

        // ボタン操作結果を取得
        dialog.afterClosed().subscribe((result: any) => {
          if (result.execute) {
            // プロセス開始
            this.startProcess(event.value.row.obj.listId, result.reviewer, result.dueDate, event.value.row.obj.documentFileId);
          }
        });

      }
    } else if (event.value.action.title === "図書ファイル表示") {

      if ((event.value.row.obj.documentFileId !== null) && (event.value.row.obj.documentFileId !== undefined) && (event.value.row.obj.documentFileId !== "")) {
        this.store.dispatch(new ViewNodeAction(event.value.row.obj.documentFileId, { location: "/personal-files" }));
      } else {
        // 操作メッセージ表示
        this.showOperationMessage("図書ファイルが未登録です。");
      }
    }

  }

  // 全表示チェックボックスクリック
  onClickShowAllCheckbox() {
    let checkShowAll = document.querySelector("#chkShowAll");
    if (checkShowAll.getAttribute('checked') === "checked") {
      checkShowAll.setAttribute('checked', '');
    } else {
      checkShowAll.setAttribute('checked', 'checked');
    }
    let chkDBData = document.querySelector("#chkDBData");
    if (chkDBData.getAttribute('checked') === "checked") {
      // DB マスタリスト初期化
      this.initMasterListForDB();
    } else {
      // マスタリスト初期化
      this.initMasterList();
    }
  }

  // DBデータ利用チェックボックスクリック
  onClickDBDataCheckbox() {
    let chkDBData = document.querySelector("#chkDBData");
    if (chkDBData.getAttribute('checked') === "checked") {
      chkDBData.setAttribute('checked', '');
      // データタイプ設定
      localStorage.setItem('listDataType', 'JsonData');
      // マスタリスト初期化
      this.initMasterList();
    } else {
      chkDBData.setAttribute('checked', 'checked');
      // データタイプ設定
      localStorage.setItem('listDataType', 'DBData');
      // DB マスタリスト初期化
      this.initMasterListForDB();
    }
  }

  // リセットボタンクリック
  onClickResetButton() {

    // 全プロセス削除
    this.deleteAllProcess();

    let chkDBData = document.querySelector("#chkDBData");
    if (chkDBData.getAttribute('checked') === "checked") {
      // データタイプ設定
      localStorage.setItem('listDataType', 'DBData');

      // ToDo DBレコード削除

      // DB 全リスト初期化
      this.initAllListForDB();
    } else {
      // データタイプ設定
      localStorage.setItem('listDataType', 'JsonData');
      // ストレージ消去
      //    localStorage.removeItem("IssueScheduleList");
      localStorage.removeItem("IssueScheduleExList");
      localStorage.removeItem("ReviewerList");
      localStorage.removeItem("DistributionList");
      localStorage.removeItem("MasterList");

      // 全リスト初期化
      this.initAllList();
    }

  }

  // 全プロセス削除
  deleteAllProcess() {

    for (let index = 0; index < this.masterLists.length; index++) {
      if (this.masterLists[index].action.indexOf("承認待ち") !== -1) {

        this.apiService.getInstance().webScript.executeWebScript(
          'DELETE',
          'processes/' + this.masterLists[index].processId,
          [],
          null,
          'api/-default-/public/workflow/versions/1',
          null
        ).then(
          (response: any) => {
            //          console.debug(response);
            // 操作メッセージ表示
            this.showOperationMessage("プロセス削除に成功しました。");
          },
          (error: any) => {
            console.error(error);
            // 操作メッセージ表示
            this.showOperationMessage("プロセス削除に失敗しました。");
          }
        );
      }
    }

  }

  // 図書詳細画面を表示
  showDocumentDetailPage() {

    let redirectUrl = this.route.snapshot.queryParams['redirectUrl'];
    if (!redirectUrl) {
      redirectUrl = this.router.url;
    }

    this.router.navigate(['/document-detail-page'], {
      queryParams: { redirectUrl: redirectUrl }
    });

  }

  // プロセス開始
  startProcess(listId: number, assignees: any, dueDate: Date, documentFileId: String): String {

    console.debug('assignees=' + assignees);
    console.debug('dueDate=' + dueDate);
    console.debug('documentFileId=' + documentFileId);
    // 操作メッセージ表示初期化
    this.showOperationMessage("");
    if (dueDate === null) {
      // 操作メッセージ表示
      this.showOperationMessage("承認申請に失敗しました（承認期限未設定）。");
      return "";
    } else if ((documentFileId === undefined) || (documentFileId === null) || (documentFileId === "")) {
      // 操作メッセージ表示
      this.showOperationMessage("承認申請に失敗しました（図書ファイル未登録）。");
      return "";
    }

    let assigneesArray = assignees.split(',');

    let processId = "";
    let taskIdList = "";
    let taskStateList = "";
    let dueAt: Date;
    this.apiService.getInstance().webScript.executeWebScript(
      'POST',
      'processes',
      [
      ],
      null,
      'api/-default-/public/workflow/versions/1',
      //      null
      {
        "processDefinitionKey": "activitiParallelReview",
        "variables": {
          //"bpm_assignees": ["user02000001", "user02000002", "user02000003"],
          "bpm_assignees": assigneesArray,
          "bpm_workflowDueDate": dueDate
        }
      }
    ).then(
      (response: any) => {
        this.apiService.getInstance().webScript.executeWebScript(
          'GET',
          'processes/' + response.entry.id + '/tasks',
          [],
          null,
          'api/-default-/public/workflow/versions/1',
          null
        ).then(
          (response: any) => {
            let cnt = 0;
            for (var entry of response.list.entries) {
              processId = entry.entry.processId;
              dueAt = entry.entry.dueAt;
              if (cnt === 0) {
                taskIdList = entry.entry.id;
                taskStateList = entry.entry.state;
              } else {
                taskIdList = taskIdList + ',' + entry.entry.id;
                taskStateList = taskStateList + ',' + entry.entry.state;
              }
              cnt++;
            }
            // 図書ファイル添付
            if (documentFileId !== "") {
              this.apiService.getInstance().webScript.executeWebScript(
                'POST',
                'processes/' + entry.entry.processId + '/items',
                [
                ],
                null,
                'api/-default-/public/workflow/versions/1',
                //      null
                {
                  "id": documentFileId
                }
              ).then(
                (response: any) => {
                  // タスク情報更新
                  this.updateTaskInfo(listId, processId, taskIdList, taskStateList, dueAt);
                  // 操作メッセージ表示
                  this.showOperationMessage("承認申請に成功しました。");
                  return "";
                },
                (error: any) => {
                  console.error(error);
                  // 操作メッセージ表示
                  this.showOperationMessage("承認申請に失敗しました（図書ファイル登録）。");
                  return "";
                }
              );
            }
          },
          (error: any) => {
            console.error(error);
            // 操作メッセージ表示
            this.showOperationMessage("承認申請に失敗しました（タスク取得）。");
            return "";
          }
        );
      },
      (error: any) => {
        // 操作メッセージ表示
        this.showOperationMessage("承認申請に失敗しました。");
        return "";
      }
    );
    return "";
  }

  // マスタリスト検索、取得
  searchMasterList(unRead: String, action: String, dueAt: String,
    projectName: String, docNumInternal: String, documentName: String,
    documentFile: String): any[] {

    let retMasterLists = [];

    for (let index = 0; index < this.masterLists.length; index++) {
      if (((unRead === undefined) || (this.masterLists[index].unRead.indexOf(unRead) !== -1)) &&
        ((action === undefined) || (this.masterLists[index].action.indexOf(action) !== -1)) &&
        ((dueAt === undefined) || (this.masterLists[index].dueAt.indexOf(dueAt) !== -1)) &&
        ((projectName === undefined) || (this.masterLists[index].projectName.indexOf(projectName) !== -1)) &&
        ((docNumInternal === undefined) || (this.masterLists[index].docNumInternal.indexOf(docNumInternal) !== -1)) &&
        ((documentName === undefined) || (this.masterLists[index].documentName.indexOf(documentName) !== -1)) &&
        ((documentFile === undefined) || (this.masterLists[index].documentFile.indexOf(documentFile) !== -1))
      ) {
        retMasterLists.push(this.masterLists[index]);
      }
    }
    return retMasterLists;

  }

  // マスタリスト取得(除外アクション以外のデータ)
  getMasterListNotActionExclusionLists(): any[] {

    let retMasterLists = [];

    for (let index = 0; index < this.masterLists.length; index++) {
      if (-1 === this.actionExclusionLists.findIndex((ent) => ent === this.masterLists[index].action)) {
        // アクション除外リストに含まれなければリストに追加
        retMasterLists.push(this.masterLists[index]);
      }
    }
    return retMasterLists;

  }

  // マスタリスト取得(ログインユーザが担当のデータ)
  getMasterListOfLoginUser(): any[] {

    let retMasterLists = [];

    this.userService.getCurrentUserInfo().subscribe((loginUser: EcmUserModel) => {

      this.loginUser = loginUser;
      for (let index = 0; index < this.masterLists.length; index++) {
        if (loginUser.id === this.masterLists[index].personInChargeNum) {
          // ログインユーザが担当であればリストに追加
          retMasterLists.push(this.masterLists[index]);
        }
      }

    });

    return retMasterLists;

  }

  // マスタリスト存在確認
  existMasterList(listId: number): Boolean {

    for (let index = 0; index < this.masterLists.length; index++) {
      if (this.masterLists[index].listId === listId) {
        return true;
      }
    }
    return false;

  }

  // 現在アクション取得
  getCurrentAction(listId: number): String {

    let retAction = "";

    for (let index = 0; index < this.masterLists.length; index++) {
      if (this.masterLists[index].listId === listId) {
        retAction = this.masterLists[index].action;
        break;
      }
    }
    return retAction;
  }

  // マスタリスト初期化
  initMasterList() {

    this.masterLists = [];
    if ((localStorage.getItem("MasterList") != null)
      && (localStorage.getItem("MasterList") != "undefined")
      && (localStorage.getItem("MasterList").length > 0)) {
      // 既に登録済みの場合
      // ストレージから登録データを取得
      this.masterLists = JSON.parse(localStorage.getItem("MasterList"));
    }
    // マスタリスト初期化(データ部分)
    this._initMasterList();
    // ローカルストレージに格納
    localStorage.setItem("MasterList", JSON.stringify(this.masterLists));

    // 表示用マスタリスト
    let showMasterLists = this.masterLists;
    // 除外アクション処理
    if (this.actionExclusionLists.length > 0) {
      // リストに除外アクションがある場合
      showMasterLists = this.getMasterListNotActionExclusionLists();
    }

    // ログインユーザが担当であれば表示
    let retMasterLists = [];
    this.userService.getCurrentUserInfo().subscribe((loginUser: EcmUserModel) => {

      for (let index = 0; index < showMasterLists.length; index++) {
        if (showMasterLists[index].deleteFlag === "0") {
          // 期限判定
          let judgeResult = this.judgeDueAt(showMasterLists[index].dueAt);
          showMasterLists[index].dueAtStatus = judgeResult;
          // 期限７日以内
          if (judgeResult !== "") {
            if (this.currentPage === "master-list-page") {
              if ((showMasterLists[index].action.indexOf("登録待ち") !== -1) || (showMasterLists[index].action.indexOf("申請待ち") !== -1) || (showMasterLists[index].action.indexOf("承認結果") !== -1)) {
                if (loginUser.id === showMasterLists[index].personInChargeNum) {
                  // ログインユーザが担当であればリストに追加
                  retMasterLists.push(showMasterLists[index]);
                }
              }
            } else {
              if (loginUser.id === showMasterLists[index].personInChargeNum) {
                // ログインユーザが担当であればリストに追加
                retMasterLists.push(showMasterLists[index]);
              }
            }
          } else {
            if (this.currentPage === "master-list-page") {
              // 将来期限（期限８日以上）
              let checkShowAll = document.querySelector("#chkShowAll");
              if (checkShowAll.getAttribute('checked') === "checked") {
                if ((showMasterLists[index].action.indexOf("登録待ち") !== -1) || (showMasterLists[index].action.indexOf("申請待ち") !== -1) || (showMasterLists[index].action.indexOf("承認結果") !== -1)) {
                  if (loginUser.id === showMasterLists[index].personInChargeNum) {
                    // ログインユーザが担当であればリストに追加
                    retMasterLists.push(showMasterLists[index]);
                  }
                }
              }
            } else {
              if (loginUser.id === showMasterLists[index].personInChargeNum) {
                // ログインユーザが担当であればリストに追加
                retMasterLists.push(showMasterLists[index]);
              }
            }
          }
        }
      }
      if (this.loginUser === null) {
        this.userService.getCurrentUserInfo().subscribe((loginUser: EcmUserModel) => {
          this.loginUser = loginUser;
          // 各種 to Do Counter表示
          this.showTaskCounter(retMasterLists.length);
        });
      } else {
        // 各種 to Do Counter表示
        this.showTaskCounter(retMasterLists.length);
      }
      // データリストに格納
      this.data.setRows(retMasterLists.map(item => { return new ObjectDataRow(item); }));

    });

  }

  // マスタリスト初期化(データ部分)
  _initMasterList() {
    if (!this.existMasterList(1)) {
      let approvalDeadline = "";
      //      if (-1 !== this.issueScheduleLists.findIndex((ent) => ent.listId === "DXC0010001")) {
      //        let issueScheduleList = this.issueScheduleLists.find((ent) => ent.listId === "DXC0010001");
      //        approvalDeadline = issueScheduleList.initPlan;
      //      }
      if (-1 !== this.issueScheduleExLists.findIndex((ent) => ent.listId === "DXC0010001")) {
        let issueScheduleExList = this.issueScheduleExLists.find((ent) => ent.listId === "DXC0010001");
        approvalDeadline = issueScheduleExList.planDate1;
      }
      this.masterLists.push({
        listId: 1,
        distributionListId: 'ABC-071-001',
        issueScheduleListId: 'DXC0010001',
        approvalDeadline: approvalDeadline,
        unRead: '未読',
        action: '初回登録待ち',
        dueAt: approvalDeadline,
        projectName: 'Aプロ',
        docNumInternal: 'ABC-071-001',
        documentName: '〇〇〇組立図',
        documentFile: '',
        documentFileId: '',
        divisionName: '',
        productField: '',
        projectNumber: 'DXC0010001',
        projectAbbr: '',
        wbsNumber: 'WBS-00010001',
        wbsName: '〇〇〇装置詳細設計',
        docNumCustomer: 'CUSTOMER-001',
        docNumVendor: 'VENDOR-001',
        documentClass: '社内',
        revNumber: '0',
        verNumber: '0',
        issueStatus: 'For Approval',
        finalStatus: '',
        finalApprovalDate: '',
        departInCharge: '〇〇設計室',
        personInChargeNum: 'user01000001',
        personInChargeName: '作成 担当者1',
        issueReqCustomer: '否',
        issueReqVendor: '要',
        reviewerListId: 'ABC-071-001',
        processId: '',
        taskId: '',
        taskState: '',
        commentState: 'false',
        applicationDate: '',
        approvalProgress: '4人中0人承認済み',
        deleteFlag: '0'
      });
    }
    if (!this.existMasterList(2)) {
      let approvalDeadline = "";
      //      if (-1 !== this.issueScheduleLists.findIndex((ent) => ent.listId === "DXC0010001")) {
      //        let issueScheduleList = this.issueScheduleLists.find((ent) => ent.listId === "DXC0010001");
      //        approvalDeadline = issueScheduleList.initPlan;
      //      }
      if (-1 !== this.issueScheduleExLists.findIndex((ent) => ent.listId === "DXC0010001")) {
        let issueScheduleExList = this.issueScheduleExLists.find((ent) => ent.listId === "DXC0010001");
        approvalDeadline = issueScheduleExList.planDate1;
      }
      this.masterLists.push({
        listId: 2,
        distributionListId: 'ABC-023-005',
        issueScheduleListId: 'DXC0010001',
        approvalDeadline: approvalDeadline,
        unRead: '未読',
        action: '初回登録待ち',
        dueAt: approvalDeadline,
        projectName: 'Aプロ',
        docNumInternal: 'ABC-023-005',
        documentName: '△△△組立図',
        documentFile: '',
        documentFileId: '',
        divisionName: '',
        productField: '',
        projectNumber: 'DXC0010001',
        projectAbbr: '',
        wbsNumber: 'WBS-00020001',
        wbsName: '△△△組立詳細設計',
        docNumCustomer: 'CUSTOMER-002',
        docNumVendor: 'VENDOR-002',
        documentClass: '社内',
        revNumber: '0',
        verNumber: '0',
        issueStatus: 'For Approval',
        finalStatus: '',
        finalApprovalDate: '',
        ueStatus: '',
        departInCharge: '△△△設計室',
        personInChargeNum: 'user01000001',
        personInChargeName: '作成 担当者1',
        issueReqCustomer: '要',
        issueReqVendor: '否',
        reviewerListId: 'ABC-023-005',
        processId: '',
        taskId: '',
        taskState: '',
        commentState: 'false',
        applicationDate: '',
        approvalProgress: '3人中0人承認済み',
        deleteFlag: '0'
      });
    }
    if (!this.existMasterList(3)) {
      let approvalDeadline = "";
      //      if (-1 !== this.issueScheduleLists.findIndex((ent) => ent.listId === "DXC0010001")) {
      //        let issueScheduleList = this.issueScheduleLists.find((ent) => ent.listId === "DXC0010001");
      //        approvalDeadline = issueScheduleList.initPlan;
      //      }
      if (-1 !== this.issueScheduleExLists.findIndex((ent) => ent.listId === "DXC0010001")) {
        let issueScheduleExList = this.issueScheduleExLists.find((ent) => ent.listId === "DXC0010001");
        approvalDeadline = issueScheduleExList.planDate1;
      }
      this.masterLists.push({
        listId: 3,
        distributionListId: 'ABC-015-001',
        issueScheduleListId: 'DXC0010001',
        approvalDeadline: approvalDeadline,
        unRead: '未読',
        action: '初回登録待ち',
        dueAt: approvalDeadline,
        projectName: 'Aプロ',
        docNumInternal: 'ABC-015-001',
        documentName: '□□□装置図',
        documentFile: '',
        documentFileId: '',
        divisionName: '',
        productField: '',
        projectNumber: 'DXC0010001',
        projectAbbr: '',
        wbsNumber: 'WBS-00030001',
        wbsName: '□□□装置詳細設計',
        docNumCustomer: 'CUSTOMER-001',
        docNumVendor: 'VENDOR-001',
        documentClass: 'ベンダー',
        revNumber: '0',
        verNumber: '0',
        issueStatus: 'For Approval',
        finalStatus: '',
        finalApprovalDate: '',
        departInCharge: '□□設計室',
        personInChargeNum: 'user01000001',
        personInChargeName: '作成 担当者1',
        issueReqCustomer: '否',
        issueReqVendor: '要',
        reviewerListId: 'ABC-015-001',
        processId: '',
        taskId: '',
        taskState: '',
        commentState: 'false',
        applicationDate: '',
        approvalProgress: '2人中0人承認済み',
        deleteFlag: '0'
      });
    }
    if (!this.existMasterList(4)) {
      let approvalDeadline = "";
      //      if (-1 !== this.issueScheduleLists.findIndex((ent) => ent.listId === "DXC0010002")) {
      //        let issueScheduleList = this.issueScheduleLists.find((ent) => ent.listId === "DXC0010002");
      //        approvalDeadline = issueScheduleList.initPlan;
      //      }
      if (-1 !== this.issueScheduleExLists.findIndex((ent) => ent.listId === "DXC0010002")) {
        let issueScheduleExList = this.issueScheduleExLists.find((ent) => ent.listId === "DXC0010002");
        approvalDeadline = issueScheduleExList.planDate1;
      }
      this.masterLists.push({
        listId: 4,
        distributionListId: 'BCD-025-002',
        issueScheduleListId: 'DXC0010002',
        approvalDeadline: approvalDeadline,
        unRead: '未読',
        action: '初回登録待ち',
        dueAt: approvalDeadline,
        projectName: 'Bプロ',
        docNumInternal: 'BCD-025-002',
        documentName: '〇△□配管図',
        documentFile: '',
        documentFileId: '',
        divisionName: '',
        productField: '',
        projectNumber: 'DXC0010002',
        projectAbbr: '',
        wbsNumber: 'WBS-00040001',
        wbsName: '〇△□配管詳細設計',
        docNumCustomer: 'CUSTOMER-001',
        docNumVendor: 'VENDOR-001',
        documentClass: '客先',
        revNumber: '0',
        verNumber: '0',
        issueStatus: 'For Approval',
        finalStatus: '',
        finalApprovalDate: '',
        departInCharge: '〇△設計室',
        personInChargeNum: 'user01000001',
        personInChargeName: '作成 担当者1',
        issueReqCustomer: '否',
        issueReqVendor: '要',
        reviewerListId: 'BCD-025-002',
        processId: '',
        taskId: '',
        taskState: '',
        commentState: 'false',
        applicationDate: '',
        approvalProgress: '4人中0人承認済み',
        deleteFlag: '0'
      });
    }
  }

  // DB マスタリスト初期化
  initMasterListForDB() {

    this.masterLists = [];
    // 操作メッセージ表示 初期化
    this.showOperationMessage("");

    this.httpClientService.get("master_list")
      .then(
        (response) => {
          this.masterLists = this.modelConvService.convertToMasterListModel(response);
          // MasterList情報表示
          this.showMasterLists();
        },
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("MasterListの取得に失敗しました。");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("MasterListの取得に失敗しました。");
        }
      );

  }

  // MasterList情報表示
  showMasterLists() {

    // 表示用マスタリスト
    let showMasterLists = this.masterLists;
    // 除外アクション処理
    if (this.actionExclusionLists.length > 0) {
      // リストに除外アクションがある場合
      showMasterLists = this.getMasterListNotActionExclusionLists();
    }

    // ログインユーザが担当であれば表示
    let retMasterLists = [];
    this.userService.getCurrentUserInfo().subscribe((loginUser: EcmUserModel) => {

      this.loginUser = loginUser;
      for (let index = 0; index < showMasterLists.length; index++) {
        // 使用(0)データのみが対象
        if (showMasterLists[index].deleteFlag === "0") {
          // 期限判定
          let judgeResult = this.judgeDueAt(showMasterLists[index].dueAt);
          showMasterLists[index].dueAtStatus = judgeResult;
          // 期限７日以内
          if (judgeResult !== "") {
            if (this.currentPage === "master-list-page") {
              if ((showMasterLists[index].action.indexOf("登録待ち") !== -1) || (showMasterLists[index].action.indexOf("申請待ち") !== -1) || (showMasterLists[index].action.indexOf("承認結果") !== -1)) {
                if (loginUser.id === showMasterLists[index].personInChargeNum) {
                  // ログインユーザが担当であればリストに追加
                  retMasterLists.push(showMasterLists[index]);
                }
              }
            } else {
              if (loginUser.id === showMasterLists[index].personInChargeNum) {
                // ログインユーザが担当であればリストに追加
                retMasterLists.push(showMasterLists[index]);
              }
            }
          } else {
            if (this.currentPage === "master-list-page") {
              // 将来期限（期限８日以上）
              let checkShowAll = document.querySelector("#chkShowAll");
              if (checkShowAll.getAttribute('checked') === "checked") {
                if ((showMasterLists[index].action.indexOf("登録待ち") !== -1) || (showMasterLists[index].action.indexOf("申請待ち") !== -1) || (showMasterLists[index].action.indexOf("承認結果") !== -1)) {
                  if (loginUser.id === showMasterLists[index].personInChargeNum) {
                    // ログインユーザが担当であればリストに追加
                    retMasterLists.push(showMasterLists[index]);
                  }
                }
              }
            } else {
              if (loginUser.id === showMasterLists[index].personInChargeNum) {
                // ログインユーザが担当であればリストに追加
                retMasterLists.push(showMasterLists[index]);
              }
            }
          }
        }
      }
      if (this.loginUser === null) {
        this.userService.getCurrentUserInfo().subscribe((loginUser: EcmUserModel) => {
          this.loginUser = loginUser;
          // 各種 to Do Counter表示
          this.showTaskCounter(retMasterLists.length);
        });
      } else {
        // 各種 to Do Counter表示
        this.showTaskCounter(retMasterLists.length);
      }
      // データリストに格納
      this.data.setRows(retMasterLists.map(item => { return new ObjectDataRow(item); }));
    });

  }

  // MasterList情報取得
  getMasterLists() {

    // 操作メッセージ表示 初期化
    this.showOperationMessage("");

    this.httpClientService.get("master_list")
      .then(
        (response) => {
          this.masterLists = this.modelConvService.convertToMasterListModel(response);
        },
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("MasterListの取得に失敗しました。");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          // 操作メッセージ表示
          this.showOperationMessage("MasterListの取得に失敗しました。");
        }
      );

  }

  // 発行スケジュールリスト存在確認
  existIssueScheduleList(listId: String): Boolean {

    for (let index = 0; index < this.issueScheduleLists.length; index++) {
      if (this.issueScheduleLists[index].listId === listId) {
        return true;
      }
    }
    return false;

  }

  // 拡張発行スケジュールリスト存在確認
  existIssueScheduleExList(listId: String): Boolean {

    for (let index = 0; index < this.issueScheduleExLists.length; index++) {
      if (this.issueScheduleExLists[index].listId === listId) {
        return true;
      }
    }
    return false;

  }

  // 発行スケジュールリスト初期化
  initIssueScheduleList() {
    this.issueScheduleLists = [];
    if ((localStorage.getItem("IssueScheduleList") != null)
      && (localStorage.getItem("IssueScheduleList") != "undefined")
      && (localStorage.getItem("IssueScheduleList").length > 0)) {
      // 既に登録済みの場合
      // ストレージから登録データを取得
      this.issueScheduleLists = JSON.parse(localStorage.getItem("IssueScheduleList"));
    }
    // 発行スケジュールリスト初期化(データ部分)
    this._initIssueScheduleList();
    // ローカルストレージに格納
    localStorage.setItem("IssueScheduleList", JSON.stringify(this.issueScheduleLists));
  }

  // 拡張発行スケジュールリスト初期化
  initIssueScheduleExList() {
    this.issueScheduleExLists = [];
    if ((localStorage.getItem("IssueScheduleExList") != null)
      && (localStorage.getItem("IssueScheduleExList") != "undefined")
      && (localStorage.getItem("IssueScheduleExList").length > 0)) {
      // 既に登録済みの場合
      // ストレージから登録データを取得
      this.issueScheduleExLists = JSON.parse(localStorage.getItem("IssueScheduleExList"));
    }
    // 拡張発行スケジュールリスト初期化(データ部分)
    this._initIssueScheduleExList();
    // ローカルストレージに格納
    localStorage.setItem("IssueScheduleExList", JSON.stringify(this.issueScheduleExLists));
  }

  // 発行スケジュールリスト初期化(データ部分)
  _initIssueScheduleList() {
    let nowDate = new Date();
    if (!this.existIssueScheduleList('DXC0010001')) {
      this.issueScheduleLists.push({
        listId: 'DXC0010001',
        initPlan: nowDate,
        initSchedule: '',
        initActual: '',
        intAppPlan: (new Date()).setDate(nowDate.getDate() + 5),
        intAppSchedule: '',
        intAppActual: '',
        cstSubPlan: (new Date()).setDate(nowDate.getDate() + 10),
        cstSubSchedule: '',
        cstSubActual: '',
        cstAppPlan: (new Date()).setDate(nowDate.getDate() + 15),
        cstAppSchedule: '',
        cstAppActual: '',
        asBuiltPlan: (new Date()).setDate(nowDate.getDate() + 20),
        asBuiltSchedule: '',
        asBuiltActual: '',
      });
    }
    if (!this.existIssueScheduleList('DXC0010002')) {
      this.issueScheduleLists.push({
        listId: 'DXC0010002',
        initPlan: (new Date()).setDate(nowDate.getDate() + 8),
        initSchedule: '',
        initActual: '',
        intAppPlan: (new Date()).setDate(nowDate.getDate() + 13),
        intAppSchedule: '',
        intAppActual: '',
        cstSubPlan: (new Date()).setDate(nowDate.getDate() + 18),
        cstSubSchedule: '',
        cstSubActual: '',
        cstAppPlan: (new Date()).setDate(nowDate.getDate() + 23),
        cstAppSchedule: '',
        cstAppActual: '',
        asBuiltPlan: (new Date()).setDate(nowDate.getDate() + 28),
        asBuiltSchedule: '',
        asBuiltActual: '',
      });
    }
  }

  // 拡張発行スケジュールリスト初期化(データ部分)
  _initIssueScheduleExList() {
    let nowDate = new Date();
    if (!this.existIssueScheduleExList('DXC0010001')) {
      this.issueScheduleExLists.push({
        listId: 'DXC0010001',
        issueName1: '初回登録',
        planDate1: nowDate,
        scheduleDate1: (new Date()).setDate(nowDate.getDate() + 3),
        actualDate1: null,
        issueName2: '社内承認',
        planDate2: (new Date()).setDate(nowDate.getDate() + 7),
        scheduleDate2: null,
        actualDate2: null,
        issueName3: '客先承認',
        planDate3: (new Date()).setDate(nowDate.getDate() + 14),
        scheduleDate3: null,
        actualDate3: null,
        issueName4: 'AS BUILT',
        planDate4: (new Date()).setDate(nowDate.getDate() + 21),
        scheduleDate4: null,
        actualDate4: null,
        issueName5: null,
        planDate5: null,
        scheduleDate5: null,
        actualDate5: null,
        issueName6: null,
        planDate6: null,
        scheduleDate6: null,
        actualDate6: null,
        issueName7: null,
        planDate7: null,
        scheduleDate7: null,
        actualDate7: null
      });
    }
    if (!this.existIssueScheduleExList('DXC0010002')) {
      this.issueScheduleExLists.push({
        listId: 'DXC0010002',
        issueName1: '初回登録',
        planDate1: (new Date()).setDate(nowDate.getDate() + 14),
        scheduleDate1: null,
        actualDate1: null,
        issueName2: '社内承認',
        planDate2: (new Date()).setDate(nowDate.getDate() + 21),
        scheduleDate2: null,
        actualDate2: null,
        issueName3: 'JV承認',
        planDate3: (new Date()).setDate(nowDate.getDate() + 28),
        scheduleDate3: null,
        actualDate3: null,
        issueName4: '客先承認',
        planDate4: (new Date()).setDate(nowDate.getDate() + 35),
        scheduleDate4: null,
        actualDate4: null,
        issueName5: 'AS BUILT',
        planDate5: (new Date()).setDate(nowDate.getDate() + 42),
        scheduleDate5: null,
        actualDate5: null,
        issueName6: null,
        planDate6: null,
        scheduleDate6: null,
        actualDate6: null,
        issueName7: null,
        planDate7: null,
        scheduleDate7: null,
        actualDate7: null
      });
    }
  }

  // DB 拡張発行スケジュールリスト初期化
  initIssueScheduleExListForDB() {
    this.issueScheduleExLists = [];
    // IssueScheduleExList情報取得
    this.getIssueScheduleExLists();
  }

  // IssueScheduleExList情報取得
  getIssueScheduleExLists() {

    // 操作メッセージ表示 初期化
    this.showOperationMessage("");

    this.httpClientService.get("issue_schedule_ex_list")
      .then(
        (response) => {
          this.issueScheduleExLists = this.modelConvService.convertToIssueScheduleExListModel(response);
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

  // レビューアリスト存在確認
  existReviewerList(listId: String): Boolean {

    for (let index = 0; index < this.reviewerLists.length; index++) {
      if (this.reviewerLists[index].listId === listId) {
        return true;
      }
    }
    return false;

  }

  // レビューアリスト初期化
  initReviewerList() {

    this.reviewerLists = [];
    if ((localStorage.getItem("ReviewerList") != null)
      && (localStorage.getItem("ReviewerList") != "undefined")
      && (localStorage.getItem("ReviewerList").length > 0)) {
      // 既に登録済みの場合
      // ストレージから登録データを取得
      this.reviewerLists = JSON.parse(localStorage.getItem("ReviewerList"));
    }
    // レビューアリスト初期化(データ部分)
    this._initReviewerList();
    // ローカルストレージに格納
    localStorage.setItem("ReviewerList", JSON.stringify(this.reviewerLists));
  }

  // レビューアリスト初期化(データ部分)
  _initReviewerList() {
    if (!this.existReviewerList('ABC-071-001')) {
      this.reviewerLists.push({
        listId: 'ABC-071-001',
        reviewerId: 'user02000001,user02000002,user02000003',
        finalApproverId: 'user03000001',
        reviewerAction: '未承認_0000_00_00_00_00,未承認_0000_00_00_00_00,未承認_0000_00_00_00_00',
        finalApproverAction: '承認申請待ち_0000_00_00_00_00'
      });
    }
    if (!this.existReviewerList('ABC-023-005')) {
      this.reviewerLists.push({
        listId: 'ABC-023-005',
        reviewerId: 'user02000002,user02000003',
        finalApproverId: 'user03000001',
        reviewerAction: '未承認_0000_00_00_00_00,未承認_0000_00_00_00_00',
        finalApproverAction: '承認申請待ち_0000_00_00_00_00'
      });
    }
    if (!this.existReviewerList('ABC-015-001')) {
      this.reviewerLists.push({
        listId: 'ABC-015-001',
        reviewerId: 'user02000002',
        finalApproverId: 'user03000001',
        reviewerAction: '未承認_0000_00_00_00_00',
        finalApproverAction: '承認申請待ち_0000_00_00_00_00'
      });
    }
    if (!this.existReviewerList('BCD-025-002')) {
      this.reviewerLists.push({
        listId: 'BCD-025-002',
        reviewerId: 'user02000001,user02000002,user02000003',
        finalApproverId: 'user03000001',
        reviewerAction: '未承認_0000_00_00_00_00,未承認_0000_00_00_00_00,未承認_0000_00_00_00_00',
        finalApproverAction: '承認申請待ち_0000_00_00_00_00'
      });
    }
  }

  // DB レビューアリスト初期化
  initReviewerListForDB() {

    this.reviewerLists = [];
    // ReviewerList情報取得
    this.getReviewerLists();
  }

  // ReviewerList情報取得
  getReviewerLists() {

    // 操作メッセージ表示 初期化
    this.showOperationMessage("");

    this.httpClientService.get("reviewer_list")
      .then(
        (response) => {
          this.reviewerLists = this.modelConvService.convertToReviewerListModel(response);
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

  // 配布先リスト存在確認
  existDistributionList(listId: String): Boolean {

    for (let index = 0; index < this.distributionLists.length; index++) {
      if (this.distributionLists[index].listId === listId) {
        return true;
      }
    }
    return false;

  }

  // 配布先リスト初期化
  initDistributionList() {

    this.distributionLists = [];
    if ((localStorage.getItem("DistributionList") != null)
      && (localStorage.getItem("DistributionList") != "undefined")
      && (localStorage.getItem("DistributionList").length > 0)) {
      // 既に登録済みの場合
      // ストレージから登録データを取得
      this.distributionLists = JSON.parse(localStorage.getItem("DistributionList"));
    }
    // レビューアリスト初期化(データ部分)
    this._initDistributionList();
    // ローカルストレージに格納
    localStorage.setItem("DistributionList", JSON.stringify(this.distributionLists));
  }

  // 配布先リスト初期化(データ部分)
  _initDistributionList() {
    if (!this.existDistributionList('ABC-071-001')) {
      this.distributionLists.push({
        listId: 'ABC-071-001',
        distributionDestId: 'user02000001,user02000002,user02000003,user04000001',
      });
    }
    if (!this.existDistributionList('ABC-023-005')) {
      this.distributionLists.push({
        listId: 'ABC-023-005',
        distributionDestId: 'user02000002,user02000003,user04000001',
      });
    }
    if (!this.existDistributionList('ABC-015-001')) {
      this.distributionLists.push({
        listId: 'ABC-015-001',
        distributionDestId: 'user02000002,user04000001',
      });
    }
    if (!this.existDistributionList('BCD-025-002')) {
      this.distributionLists.push({
        listId: 'BCD-025-002',
        distributionDestId: 'user02000002,user04000001',
      });
    }
  }

  // DB 配布先リスト初期化
  initDistributionListForDB() {

    this.distributionLists = [];
    // DistributionList情報取得
    this.getDistributionLists();
  }

  // DistributionList情報取得
  getDistributionLists() {

    // 操作メッセージ表示 初期化
    this.showOperationMessage("");

    this.httpClientService.get("distribution_list")
      .then(
        (response) => {
          this.distributionLists = this.modelConvService.convertToDistributionListModel(response);
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

  // レビューア情報取得
  getReviewerInfo(listId: number): ReviewerListModel {

    let reviewerListModel: ReviewerListModel;

    let getIndex = 0;
    for (let index = 0; index < this.masterLists.length; index++) {
      if (this.masterLists[index].listId === listId) {
        getIndex = index;
        break;
      }
    }
    for (let index = 0; index < this.reviewerLists.length; index++) {
      if (this.reviewerLists[index].listId === this.masterLists[getIndex].reviewerListId) {
        reviewerListModel = {
          listId: this.reviewerLists[index].listId,
          reviewerId: this.reviewerLists[index].reviewerId,
          finalApproverId: this.reviewerLists[index].finalApproverId
        };
        return reviewerListModel;
      }
    }
    return reviewerListModel;
  }

  // タスク情報更新
  updateTaskInfo(listId: number, processId: string, taskId: string, taskState: string, dueAt: Date) {

    let chgIndex = 0;
    for (let index = 0; index < this.masterLists.length; index++) {
      if (this.masterLists[index].listId === listId) {
        chgIndex = index;
        break;
      }
    }
    this.masterLists[chgIndex].processId = processId;
    this.masterLists[chgIndex].taskId = taskId;
    this.masterLists[chgIndex].taskState = taskState;
    this.masterLists[chgIndex].dueAt = dueAt;
    if (this.masterLists[chgIndex].action === '初回登録待ち') {
      this.masterLists[chgIndex].action = '初回承認待ち';
    } else if (this.masterLists[chgIndex].action === '登録待ち') {
      this.masterLists[chgIndex].action = '承認待ち';
    } else if (this.masterLists[chgIndex].action === '初回申請待ち') {
      this.masterLists[chgIndex].action = '初回承認待ち';
    } else if (this.masterLists[chgIndex].action === '申請待ち') {
      this.masterLists[chgIndex].action = '承認待ち';
    }
    // 最終ステータス
    this.masterLists[chgIndex].finalStatus = this.masterLists[chgIndex].issueStatus;
    let chkDBData = document.querySelector("#chkDBData");
    if (chkDBData.getAttribute('checked') === "checked") {
      // DB タスク情報更新(initMasterListFor関数も実施)
      this.updateTaskInfoForDB(listId, this.masterLists[chgIndex], true);
    } else {
      // ローカルストレージに格納
      localStorage.setItem("MasterList", JSON.stringify(this.masterLists));
      // マスタリスト初期化
      this.initMasterList();
    }
  }

  // DB タスク情報更新
  updateTaskInfoForDB(listId: number, rowData: any, initFlag: boolean) {
    // 操作メッセージ初期化
    this.showOperationMessage("");

    // MasterList
    const body: any = {
      processid: rowData.processId,
      taskid: rowData.taskId,
      taskstate: rowData.taskState,
      dueat: rowData.dueAt,
      action: rowData.action,
      finalstatus: rowData.finalStatus
    };
    this.updateMasterList(listId, body, initFlag);

  }

  // MasterList更新
  updateMasterList(listId: number, body: any, initFlag: boolean) {

    this.httpClientService.update(listId, "listid", "master_list", body)
      .then(
        (response) => {
          console.debug(response);
          // 操作メッセージ表示
          this.showOperationMessage("MasterListの更新に成功しました。");
          // 更新後初期化ありの場合
          if (initFlag) {
            // DB マスタリスト初期化
            this.initMasterListForDB();
          }
        },
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("MasterListの更新に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      )
      .catch(
        (error) => {
          console.error(error);
          let errorArray = error.split(' ');
          let errorStatus = errorArray[errorArray.length - 2];
          let errorStatusText = errorArray[errorArray.length - 1];
          // 操作メッセージ表示
          this.showOperationMessage("MasterListの更新に失敗しました。(" + errorStatus + ":" + errorStatusText + ")");
        }
      );

  }

  // 期限判定
  judgeDueAt(dueAt: any): String {

    // 現在日付
    let nowDate = new Date();
    // 7日後日付
    let after7Date = (new Date()).setDate(nowDate.getDate() + 7);
    // 3日後日付
    let after3Date = (new Date()).setDate(nowDate.getDate() + 3);
    // 1日前日付
    let before1Date = (new Date()).setDate(nowDate.getDate() - 1);

    if (((dueAt !== null) && (dueAt !== undefined)) &&
      (((after3Date.valueOf()) <= (new Date(dueAt)).valueOf()) &&
        ((new Date(dueAt)).valueOf() <= after7Date.valueOf()))) {
      // 期限日付が7日前から3日前までの場合
      return "white";

    } else if (((dueAt !== null) && (dueAt !== undefined)) &&
      (((before1Date.valueOf()) < (new Date(dueAt)).valueOf()) &&
        ((new Date(dueAt)).valueOf() < after3Date.valueOf()))) {
      // 期限日付が3日前から現在日付までの場合
      return "yellow";

    } else if (((dueAt !== null) && (dueAt !== undefined)) &&
      ((new Date(dueAt)).valueOf() <= (before1Date.valueOf()))) {
      // 期限日付が現在日付以前の場合
      return "pink";

    }
    // 期限日付が7日前以前の場合は空を返す
    return "";

  }

  // 未読 検索変更イベント
  onUnReadSearchChanged(event: String) {
    // 未読 検索文字列
    this.unReadSearchStr = event;

  }

  // アクション 検索変更イベント
  onActionSearchChanged(event: String) {
    // アクション 検索文字列
    this.actionSearchStr = event;

  }

  // 期限 検索変更イベント
  onDueAtSearchChanged(event: String) {
    // 期限 検索文字列
    this.dueAtSearchStr = event;

  }

  // プロジェクト名 検索変更イベント
  onProjectNameSearchChanged(event: String) {
    // プロジェクト名 検索文字列
    this.projectNameSearchStr = event;

  }

  // 図書番号(社内管理番号) 検索変更イベント
  onDocNumInternalSearchChanged(event: String) {
    // 図書番号(社内管理番号) 検索文字列
    this.docNumInternalSearchStr = event;

  }

  // 図書名 検索変更イベント
  onDocumentNameSearchChanged(event: String) {
    // 図書名 検索文字列
    this.documentNameSearchStr = event;

  }

  // 図書ファイル 検索変更イベント
  onDocumentFileSearchChanged(event: String) {
    // 図書ファイル 検索文字列
    this.documentFileSearchStr = event;

  }

  onSubmit(event: any) {

    // マスタリスト存在確認
    let searchMasterLists =
      this.searchMasterList(this.unReadSearchStr,
        this.actionSearchStr,
        this.dueAtSearchStr,
        this.projectNameSearchStr,
        this.docNumInternalSearchStr, this.documentNameSearchStr,
        this.documentFileSearchStr);

    // データリストに格納
    this.data.setRows(searchMasterLists.map(item => { return new ObjectDataRow(item); }));

  }

}
