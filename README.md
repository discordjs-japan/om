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

## Notice

The docker version includes `HTS Voice "NIT ATR503 M001" version 1.05` downloaded from:
<http://downloads.sourceforge.net/open-jtalk/hts_voice_nitech_jp_atr503_m001-1.05.tar.gz>
