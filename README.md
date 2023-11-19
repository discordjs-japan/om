# om

Discord.js Japan User Group向けの読み上げボットです．

## 使い方

まず，`.env.example`を参考に`.env`ファイルを作成します．
`DISCORD_TOKEN=`の後に続けて，[Discord Developer Portal](https://discord.com/developers/applications)
から取得したトークンを記述してください．

次に，`model`ディレクトリを作成し，ダウンロードした辞書と音声モデルを置いてください．
辞書は
[naist-jdic-jpreprocess.tar.gz](https://github.com/jpreprocess/jpreprocess/releases/download/v0.6.1/naist-jdic-jpreprocess.tar.gz)，
モデルは
[hts_voice_nitech_jp_atr503_m001-1.05.tar.gz](http://downloads.sourceforge.net/open-jtalk/hts_voice_nitech_jp_atr503_m001-1.05.tar.gz)
をお勧めします．
いずれもダウンロードした後解凍が必要です．

それぞれ次の図のように，パスが`model/naist-jdic`，`model/nitech_jp_atr503_m001.htsvoice`となるように配置してください．
```
(project-root)
┣ model
┃  ┣ naist-jdic
┃  ┃  ┣ char_def.bin
┃  ┃  ┣ dict.da
┃  ┃  ┣ dict.vals
┃  ┃  ┣ dict.words
┃  ┃  ┣ dict.wordsidx
┃  ┃  ┣ matrix.mtx
┃  ┃  ┗ unk.bin
┃  ┗ nitech_jp_atr503_m001.htsvoice
┗ .env
```

最後に，次のコマンドを実行すると，ボットが起動します（Dockerがインストールされていることが必要です）．

```bash
docker run \
  --rm \
  -d \
  -v ./model:/app/model \
  --env-file .env \
  -e DICTIONARY=model/naist-jdic \
  -e MODEL=model/nitech_jp_atr503_m001.htsvoice \
  ghcr.io/discordjs-japan/om:latest
```
