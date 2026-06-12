"use client";

import { createCommand } from "lexical";

export const SET_SELECTED_TABLE_KEY_COMMAND = createCommand<string | null>();
