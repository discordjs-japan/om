# om

Discord.js Japan User Group向けの読み上げボットです．

## 使い方

### [Dockerfile](./Dockerfile)で定義したイメージを使う

まず，`.env.example`を参考に`.env`ファイルを作成します．
`DISCORD_TOKEN=`の後に続けて，[Discord Developer Portal](https://discord.com/developers/applications)
から取得したトークンを記述してください．

次のコマンドを実行すると，ボットが起動します（Dockerがインストールされていることが必要です）．

```bash
docker run --rm -d --env-file .env ghcr.io/discordjs-japan/om:latest
```

### 手動で準備する

このボットを起動するには，以下のような準備が必要です．具体的な手順については，[Dockerfile](./Dockerfile)を参考にしてください．

- [`.node-version`](./.node-version)で指定されているバージョンのNode.jsをインストールする
- 依存関係 (`node_modules`) をインストールする
  - Dockerfileの`deps`ステージに対応します．
- ソースコードをJavaScriptにコンパイルする
  - Dockerfileの`builder`ステージに対応します．
- 読み上げ用の辞書をダウンロードする
  - Dockerfileの`dictionary`ステージに対応します．
  - ダウンロードした辞書のパスを起動時に環境変数`DICTIONARY`で指定する必要があります．
- 音声合成用のモデルをダウンロードする
  - Dockerfileの`models`ステージに対応します．
  - ダウンロードしたモデルのパスを起動時に環境変数`MODELS`で指定する必要があります．複数指定する場合は`,`で区切ってください．

環境変数の一覧はこちらです：

- `DICTIONARY`：読み上げ用の辞書のパス
  - 必ず指定してください．
- `USER_DICTIONARY`：ユーザー定義の辞書のパス
  - 指定しなくても動作します．
- `MODELS`：音声合成用のモデルのパス
  - 必ず指定してください．
  - 複数指定する場合は`,`で区切ってください．
- `DISCORD_TOKEN`：Discord Developer Portalから取得したトークン
  - 必ず指定してください．
- `NUM_THREADS`：音声合成を行うスレッド数
  - 指定しなくても動作します．
  - デフォルトは1です．

## Copyright Notice

For copyright of dependent packages, please see package.json.

### [HTS voice tohoku-f01](https://github.com/icn-lab/htsvoice-tohoku-f01)

> [!NOTE]
> HTS Voice is only included in Docker container

Creative Commons Attributions 4.0

- Copyright (c) 2015 Intelligent Communication Network (Ito-Nose) Laboratory, Tohoku University.

### [naist-jdic](https://github.com/jpreprocess/jpreprocess/releases/download/v0.6.1/naist-jdic-jpreprocess.tar.gz)

> [!NOTE]
> naist-jdic is only included in Docker container

BSD 3-Clause License

- Copyright (c) 2009, Nara Institute of Science and Technology, Japan.
- Copyright (c) 2011-2017, The UniDic Consortium
- Copyright (c) 2008-2016 Nagoya Institute of Technology Department of Computer Science
- Copyright (c) 2023, JPreprocess Team
