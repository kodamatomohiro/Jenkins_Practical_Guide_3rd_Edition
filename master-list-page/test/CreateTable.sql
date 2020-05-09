create table ブロワ(
"レコード番号" INTEGER PRIMARY KEY,
"ユニット名"  VARCHAR(256),
"商品分野名"  VARCHAR(256),
"プロジェクト番号"  VARCHAR(256),
"プロジェクト名"  VARCHAR(256),
"WBSコード"  VARCHAR(256),
"WBS名"  VARCHAR(256),
"品目コード名"  VARCHAR(256),
"品目名"  VARCHAR(256),
"品目コード"  VARCHAR(256),
"品目名称"  VARCHAR(256),
"機器名"  VARCHAR(256),
"吸込風量(Nm3/min)"  VARCHAR(256),
"静圧差(kPa)"  VARCHAR(256),
"吸込温度(℃）"  VARCHAR(256),
"耐熱温度（℃）"  VARCHAR(256),
"取扱気体"  VARCHAR(256),
"回転数(rpm)"  VARCHAR(256),
"軸動力(kW)"  VARCHAR(256),
"結合方式"  VARCHAR(256),
"吸込形式"  VARCHAR(256),
"軸受支持"  VARCHAR(256),
"騒音値＠機器側1m(dBA)"  VARCHAR(256),
"風量制御方式"  VARCHAR(256),
"インペラ材質"  VARCHAR(256),
"ケーシング材質"  VARCHAR(256),
"シャフト材質"  VARCHAR(256),
"ダンパ"  VARCHAR(256),
"サイレンサー（吸込/吐出）"  VARCHAR(256),
"伸縮管"  VARCHAR(256),
"軸受温度計"  VARCHAR(256),
"軸受振動計"  VARCHAR(256),
"防音カバー/ラギング"  VARCHAR(256),
"出力(kW)"  VARCHAR(256),
"周波数(Hz)"  VARCHAR(256),
"電圧(V)"  VARCHAR(256),
"極数(P)"  VARCHAR(256),
"電動機規格/保護階級"  VARCHAR(256),
"送風機重量(kg)"  VARCHAR(256),
"電動機重量(kg)"  VARCHAR(256),
"ダンパ重量(kg)"  VARCHAR(256),
"伸縮管重量+サイレンサ(kg)"  VARCHAR(256),
"総重量(kg)"  VARCHAR(256),
"口径"  VARCHAR(256),
"型式"  VARCHAR(256),
"仕様特記"  VARCHAR(256),
"価格"  NUMERIC(20,2),
"ベンダー（取引先）"  VARCHAR(256),
"ベンダー（代理店）"  VARCHAR(256),
"ベンダー（製造元）"  VARCHAR(256),
"契約番号"  VARCHAR(256),
"価格取得日"   DATE,
"価格取得者（社員番号）"  VARCHAR(256),
"価格取得者（氏名）"  VARCHAR(256),
"見積区分（ネゴ前／ネゴ後／契約）"  VARCHAR(256),
"利用可否（可、要注意、不可）"  VARCHAR(256),
"利用可否理由"  VARCHAR(256),
"設計担当者（社員番号）"  VARCHAR(256),
"設計担当者（氏名）"  VARCHAR(256),
"調達担当者（社員番号）"  VARCHAR(256),
"調達担当者（氏名）"  VARCHAR(256),
"購入仕様書【リンク】"  VARCHAR(256),
"見積書【リンク】"  VARCHAR(256),
"備考"  VARCHAR(256),
"更新時刻" CHAR(23)  )




create table 一般弁(
"レコード番号" INTEGER PRIMARY KEY,
"ユニット名" VARCHAR(256),
"商品分野名" VARCHAR(256),
"プロジェクト番号" VARCHAR(256),
"プロジェクト名" VARCHAR(256),
"WBSコード" VARCHAR(256),
"WBS名" VARCHAR(256),
"品目コード名" VARCHAR(256),
"品目名" VARCHAR(256),
"品目コード" VARCHAR(256),
"品目名称" VARCHAR(256),
"機器名" VARCHAR(256),
"流体名" VARCHAR(256),
"設計圧力(MPa)" VARCHAR(256),
"設計温度(℃)" VARCHAR(256),
"弁の種類" VARCHAR(256),
"口径(A)" VARCHAR(256),
"ﾚｲﾃｨﾝｸ" VARCHAR(256),
"接続形式" VARCHAR(256),
"型式" VARCHAR(256),
"禁油" VARCHAR(256),
"型番" VARCHAR(256),
"本体材質" VARCHAR(256),
"要部材質" VARCHAR(256),
"仕様特記" VARCHAR(256),
"価格" NUMERIC(20,2),
"ベンダー（取引先）" VARCHAR(256),
"ベンダー（代理店）" VARCHAR(256),
"ベンダー（製造元）" VARCHAR(256),
"契約番号" VARCHAR(256),
"価格取得日" DATE,
"価格取得者（社員番号）" VARCHAR(256),
"価格取得者（氏名）" VARCHAR(256),
"見積区分（ネゴ前／ネゴ後／契約）" VARCHAR(256),
"利用可否（可、要注意、不可）" VARCHAR(256),
"利用可否理由" VARCHAR(256),
"設計担当者（社員番号）" VARCHAR(256),
"設計担当者（氏名）" VARCHAR(256),
"調達担当者（社員番号）" VARCHAR(256),
"調達担当者（氏名）" VARCHAR(256),
"購入仕様書【リンク】" VARCHAR(256),
"見積書【リンク】" VARCHAR(256),
"備考" VARCHAR(256),
"更新時刻" CHAR(23)  )

