import { createChat } from './engine.js';
import { SCRIPT } from './script.ar.js';

createChat({
  script: SCRIPT,
  thread: document.getElementById('chat-thread'),
  typing: document.getElementById('chat-typing'),
  replies: document.getElementById('chat-replies'),
}).start();
