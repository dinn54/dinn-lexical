"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { COMMAND_PRIORITY_EDITOR } from "lexical";

import {
  $createTweetNode,
  INSERT_TWEET_COMMAND,
} from "../nodes/TweetNode";
import {
  $createYouTubeNode,
  INSERT_YOUTUBE_COMMAND,
} from "../nodes/YouTubeNode";

export function InsertEmbedsPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_TWEET_COMMAND,
      (tweetId: string) => {
        editor.update(() => {
          $insertNodeToNearestRoot($createTweetNode(tweetId));
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      INSERT_YOUTUBE_COMMAND,
      (videoId: string) => {
        editor.update(() => {
          $insertNodeToNearestRoot($createYouTubeNode(videoId));
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
