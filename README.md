# om

Discord.js Japan User Group向けの読み上げボットです．

## 使い方

まず，`.env.example`を参考に`.env`ファイルを作成します．
`DISCORD_TOKEN=`の後に続けて，[Discord Developer Portal](https://discord.com/developers/applications)
から取得したトークンを記述してください．

次のコマンドを実行すると，ボットが起動します（Dockerがインストールされていることが必要です）．

```bash
docker run --rm -d --env-file .env ghcr.io/discordjs-japan/om:latest
```

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
