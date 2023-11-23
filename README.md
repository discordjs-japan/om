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

### [HTS Voice "NIT ATR503 M001" version 1.05](http://downloads.sourceforge.net/open-jtalk/hts_voice_nitech_jp_atr503_m001-1.05.tar.gz)

> [!NOTE]
> HTS Voice is only included in Docker container

Creative Commons Attribution 3.0

- Copyright (c) 2003-2012  Nagoya Institute of Technology Department of Computer Science
- Copyright (c) 2003-2008  Tokyo Institute of Technology Interdisciplinary Graduate School of Science and Engineering

### [naist-jdic](https://github.com/jpreprocess/jpreprocess/releases/download/v0.6.1/naist-jdic-jpreprocess.tar.gz)

> [!NOTE]
> naist-jdic is only included in Docker container

BSD 3-Clause License

- Copyright (c) 2009, Nara Institute of Science and Technology, Japan.
- Copyright (c) 2011-2017, The UniDic Consortium
- Copyright (c) 2008-2016 Nagoya Institute of Technology Department of Computer Science
- Copyright (c) 2023, JPreprocess Team
