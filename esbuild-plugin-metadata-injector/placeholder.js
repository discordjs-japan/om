// @ts-check

import gitDescribe from "git-describe";
import packageJSON from "../package.json" with { type: "json" };

export const PACKAGE_VERSION = packageJSON.version;
export const GIT_DESCRIBE = gitDescribe.gitDescribeSync().raw;
