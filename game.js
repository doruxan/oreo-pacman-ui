import io from "socket.io-client";
import {
  DIRECTION_BOTTOM,
  DIRECTION_UP,
  DIRECTION_LEFT,
  DIRECTION_RIGHT,
  map,
  oneBlockSize,
  score,
  canvasContext,
  pacmanFrames,
  canvas,
  ghostFrames,
  oreoFrame,
} from "./const.js";

import { Pacman } from "./pacman.js";
import {
  Ghost,
  updateGhosts,
  drawGhosts,
  ghosts,
  createGhosts,
} from "./ghost.js";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to server:");
});

// Example: Listen for a 'message' event from the server
socket.on("product", (data) => {
  console.log("Received message from server:", data);
});

let createRect = (x, y, width, height, color) => {
  canvasContext.fillStyle = color;
  canvasContext.fillRect(x, y, width, height);
};

export let lives = 3;

// Game variables
export const fps = 30;
export let pacman;
export let wallSpaceWidth = oneBlockSize / 1.6;
export let wallOffset = (oneBlockSize - wallSpaceWidth) / 2;
export let wallInnerColor = "black";
var oreos = 0;
// count all the 2s in the map
for (let i = 0; i < map.length; i++) {
  for (let j = 0; j < map[0].length; j++) {
    if (map[i][j] == 2) {
      oreos++;
    }
  }
}

// for (let i = 0; i < map.length; i++) {
//     for (let j = 0; j < map[0].length; j++) {
//         map[i][j] = 2;
//     }
// }

let createNewPacman = () => {
  pacman = new Pacman(
    oneBlockSize,
    oneBlockSize,
    oneBlockSize,
    oneBlockSize,
    oneBlockSize / 5
  );
};

let gameLoop = (pacman) => {
  update(pacman);
  draw();
};

let gameInterval = setInterval(() => gameLoop(pacman), 1000 / fps);

let restartPacmanAndGhosts = (pacman) => {
  createNewPacman();
  createGhosts(pacman);
};

let onGhostCollision = (pacman) => {
  lives--;
  restartPacmanAndGhosts(pacman);
  if (lives == 0) {
    socket.emit("loose");
  }
};

let update = (pacman) => {
  pacman.moveProcess();
  pacman.eat();
  updateGhosts(pacman);
  if (pacman.checkGhostCollision(ghosts)) {
    onGhostCollision(pacman);
  }
  if (oreos == score) {
    socket.emit("win");
  }
};

let drawFoods = () => {
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[0].length; j++) {
      if (map[i][j] == 2) {
        canvasContext.save();
        canvasContext.drawImage(
          oreoFrame,
          j * oneBlockSize + oneBlockSize / 3,
          i * oneBlockSize + oneBlockSize / 3,
          oneBlockSize / 2,
          oneBlockSize / 2
        );
        canvasContext.restore();
      }
    }
  }
};

let drawRemainingLives = () => {
  canvasContext.font = "20px Emulogic";
  canvasContext.fillStyle = "white";
  canvasContext.fillText("Lives: ", 220, oneBlockSize * (map.length + 1));

  for (let i = 0; i < lives; i++) {
    canvasContext.drawImage(
      pacmanFrames,
      2 * oneBlockSize,
      0,
      oneBlockSize / 2,
      oneBlockSize / 2,
      300 + i * oneBlockSize,
      oneBlockSize * map.length + 2,
      oneBlockSize,
      oneBlockSize
    );
  }
};

let drawScore = () => {
  canvasContext.font = "20px Emulogic";
  canvasContext.fillStyle = "white";
  canvasContext.fillText("Score: " + score, 0, oneBlockSize * (map.length + 1));
};

let draw = () => {
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  createRect(0, 0, canvas.width, canvas.height, "black");
  drawWalls();
  drawFoods();
  drawGhosts();
  pacman.draw();
  drawScore();
  drawRemainingLives();
};

let drawWalls = () => {
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[0].length; j++) {
      if (map[i][j] == 1) {
        createRect(
          j * oneBlockSize,
          i * oneBlockSize,
          oneBlockSize,
          oneBlockSize,
          "#342DCA"
        );
        if (j > 0 && map[i][j - 1] == 1) {
          createRect(
            j * oneBlockSize,
            i * oneBlockSize + wallOffset,
            wallSpaceWidth + wallOffset,
            wallSpaceWidth,
            wallInnerColor
          );
        }

        if (j < map[0].length - 1 && map[i][j + 1] == 1) {
          createRect(
            j * oneBlockSize + wallOffset,
            i * oneBlockSize + wallOffset,
            wallSpaceWidth + wallOffset,
            wallSpaceWidth,
            wallInnerColor
          );
        }

        if (i < map.length - 1 && map[i + 1][j] == 1) {
          createRect(
            j * oneBlockSize + wallOffset,
            i * oneBlockSize + wallOffset,
            wallSpaceWidth,
            wallSpaceWidth + wallOffset,
            wallInnerColor
          );
        }

        if (i > 0 && map[i - 1][j] == 1) {
          createRect(
            j * oneBlockSize + wallOffset,
            i * oneBlockSize,
            wallSpaceWidth,
            wallSpaceWidth + wallOffset,
            wallInnerColor
          );
        }
      }
    }
  }
};

createNewPacman();
createGhosts(pacman);
gameLoop(pacman);

window.addEventListener("keydown", (event) => {
  let k = event.keyCode;
  setTimeout(() => {
    if (k == 37 || k == 65) {
      // left arrow or a
      pacman.nextDirection = DIRECTION_LEFT;
    } else if (k == 38 || k == 87) {
      // up arrow or w
      pacman.nextDirection = DIRECTION_UP;
    } else if (k == 39 || k == 68) {
      // right arrow or d
      pacman.nextDirection = DIRECTION_RIGHT;
    } else if (k == 40 || k == 83) {
      // bottom arrow or s
      pacman.nextDirection = DIRECTION_BOTTOM;
    }
  }, 1);
});

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const threshold = 30; // Minimum swipe distance in pixels

window.addEventListener("touchstart", handleTouchStart, false);
window.addEventListener("touchmove", handleTouchMove, false);
window.addEventListener("touchend", handleTouchEnd, false);

function handleTouchStart(event) {
  event.preventDefault();
  touchStartX = event.changedTouches[0].screenX;
  touchStartY = event.changedTouches[0].screenY;
}

function handleTouchMove(event) {
  event.preventDefault();
  touchEndX = event.changedTouches[0].screenX;
  touchEndY = event.changedTouches[0].screenY;
}

function handleTouchEnd(event) {
  event.preventDefault();
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swipe Right
        pacman.nextDirection = DIRECTION_RIGHT;
      } else {
        // Swipe Left
        pacman.nextDirection = DIRECTION_LEFT;
      }
    }
  } else {
    if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        // Swipe Down
        pacman.nextDirection = DIRECTION_BOTTOM;
      } else {
        // Swipe Up
        pacman.nextDirection = DIRECTION_UP;
      }
    }
  }
}
