import path from "node:path";
import type { Attachment, Message } from "discord.js";

export function getSuffixFromAttachments(message: Message) {
  const countByAttachmentTypes: Record<string, number> = {};
  for (const attachment of message.attachments.values()) {
    const attachmentType = getAttachmentType(attachment);
    if (countByAttachmentTypes[attachmentType])
      countByAttachmentTypes[attachmentType]++;
    else countByAttachmentTypes[attachmentType] = 1;
  }

  return Object.entries(countByAttachmentTypes)
    .map(([type, count]) => {
      const read = SPECIAL_ATTACHMENT_TYPE_READ[type] ?? `${type}ファイル`;
      if (count === 1) return read;
      else if (count < 10) return `${count}つの${read}`;
      else return `${count}個の${read}`;
    })
    .join(" ");
}

const SPECIAL_ATTACHMENT_TYPE_READ: Record<string, string> = {
  image: "画像",
  video: "動画",
  audio: "音声",
};

function getAttachmentType(attachment: Attachment) {
  if (attachment.contentType) {
    const [type] = attachment.contentType.split("/");
    if (type in SPECIAL_ATTACHMENT_TYPE_READ) return type;
  }

  const extname = path.extname(attachment.name);
  return extname ? extname.slice(1) : attachment.name;
}
