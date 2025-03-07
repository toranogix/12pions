
// v1 ===> Date: 2025-03-01
// Description: Jeu des 12 pions

document.addEventListener("DOMContentLoaded", () => {
  const boardSize = 5;
  let board = [];
  let currentPlayer = 1;
  let selectedPiece = null;
  
  // Chemin de base pour les images
  const baseImagePath = window.location.pathname.includes('/public/')
    ? "images/"
    : "public/images/";

  // Récupérer le paramètre ?mode=ai pour le jeu contre l'ordinateur
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }
  const gameMode = getQueryParam("mode");
  const isAgainstComputer = (gameMode === "ai");

  const boardElement = document.getElementById("game-board");
  const statusElement = document.getElementById("status");
  const newGameButton = document.getElementById("new-game-button");
  const resetGameButton = document.getElementById("reset-game-button");
  const abandonButton = document.getElementById("abandon-button");

  // Popup de victoire
  const winnerModal = document.getElementById("winner-modal");
  const replayPopupButton = document.getElementById("popup-replay");

  // ====================== INITIALISATION DU PLATEAU ======================
  function initBoard() {
    board = Array(boardSize).fill().map(() => Array(boardSize).fill(null));
    
    // Pions noirs (joueur 1)
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < boardSize; x++) {
        board[y][x] = { player: 1, promoted: false };
      }
    }
    // Ligne 2 : 2 pions noirs
    board[2][0] = { player: 1, promoted: false };
    board[2][1] = { player: 1, promoted: false };

    // Pions blancs (joueur 2)
    board[2][3] = { player: 2, promoted: false };
    board[2][4] = { player: 2, promoted: false };
    for (let y = 3; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        board[y][x] = { player: 2, promoted: false };
      }
    }
    
    renderBoard();
    updateStatus();
  }

  // ====================== AFFICHAGE DU PLATEAU ======================
  function renderBoard() {
    boardElement.innerHTML = "";
    for (let y = 0; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.x = x;
        cell.dataset.y = y;
        
        if (board[y][x]) {
          let piece = document.createElement("img");
          piece.classList.add("piece");
          if (board[y][x].player === 1) {
            piece.src = board[y][x].promoted
              ? baseImagePath + "dame_noire.png"
              : baseImagePath + "pion_noir.png";
          } else {
            piece.src = board[y][x].promoted
              ? baseImagePath + "dame_blanche.png"
              : baseImagePath + "pion_blanc.png";
          }
          piece.draggable = true;
          piece.dataset.x = x;
          piece.dataset.y = y;
          piece.addEventListener("dragstart", handleDragStart);
          cell.appendChild(piece);
        }
        
        cell.addEventListener("dragover", handleDragOver);
        cell.addEventListener("drop", handleDrop);
        boardElement.appendChild(cell);
      }
    }
  }

  // ====================== DRAG & DROP ======================
  function handleDragStart(event) {
    selectedPiece = { x: event.target.dataset.x, y: event.target.dataset.y };
    event.dataTransfer.setData("text/plain", JSON.stringify(selectedPiece));
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function handleDrop(event) {
    event.preventDefault();
    let data = JSON.parse(event.dataTransfer.getData("text/plain"));
    let newX = parseInt(event.currentTarget.dataset.x);
    let newY = parseInt(event.currentTarget.dataset.y);
    
    // Multi-saut 
    const capturedPositions = getCapturedPositions(data.x, data.y, newX, newY);
    if (capturedPositions) {
      // Appliquer le déplacement
      board[newY][newX] = board[data.y][data.x];
      board[data.y][data.x] = null;

      // Supprimer les pions adverses sautés
      capturedPositions.forEach(({ cx, cy }) => {
        board[cy][cx] = null;
      });

      // Promotion
      if (
        (board[newY][newX].player === 1 && newY === boardSize - 1) ||
        (board[newY][newX].player === 2 && newY === 0)
      ) {
        board[newY][newX].promoted = true;
      }
      
      if (checkWin()) {
        renderBoard();
        return;
      }
      
      // Changement de joueur
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      updateStatus();
      renderBoard();

      // Si on joue contre l'ordinateur, c'est son tour
      if (isAgainstComputer && currentPlayer === 2) {
        setTimeout(makeComputerMove, 500);
      }
    }
  }

  // ====================== LOGIQUE DE CAPTURE DES PIONS ======================
  /**
   * => Les pions non promus peuvent faire des multi-sauts successifs, mais à chaque capture,
   * => ils atterrissent immédiatement sur la case vide derrière le pion ennemi
   * => Les dames peuvent avancer/reculer de plusieurs cases et enchaîner les captures.
   */
  function getCapturedPositions(x1, y1, x2, y2) {
    x1 = parseInt(x1); 
    y1 = parseInt(y1);
    x2 = parseInt(x2); 
    y2 = parseInt(y2);

    const piece = board[y1][x1];
    if (!piece || piece.player !== currentPlayer) {
      statusElement.textContent = "Mouvement invalide : pièce non valide ou pas votre tour.";
      return null;
    }

    // Vérification sens pions non promus
    if (!piece.promoted) {
      if (piece.player === 1 && y2 < y1) {
        statusElement.textContent = "Pion non promu (joueur 1) ne peut pas reculer.";
        return null;
      }
      if (piece.player === 2 && y2 > y1) {
        statusElement.textContent = "Pion non promu (joueur 2) ne peut pas avancer vers le bas.";
        return null;
      }
    }

    // Checker Le mouvement doit être vertical ou horizontal
    if (x1 !== x2 && y1 !== y2) {
      statusElement.textContent = "Mouvement invalide : doit être vertical ou horizontal.";
      return null;
    }


    if (!piece.promoted) {
      return getCapturedPositionsForNonPromoted(x1, y1, x2, y2, piece);
    } else {
      return getCapturedPositionsForDame(x1, y1, x2, y2, piece);
    }
  }

  

  /** Fonction pour permettre au pions non promus de faire plusieurs captures 
   * mais chaque capture se fait en sautant 1 pion ennemi adjacent + en atterrissant
   * exactement sur la case libre qui suit (pas de saut supplémentaire). 
   */
  function getCapturedPositionsForNonPromoted(x1, y1, x2, y2, piece) {
    let captured = [];
    let dx = Math.sign(x2 - x1);
    let dy = Math.sign(y2 - y1);
  
    let curX = x1;
    let curY = y1;
  


    // Boucle pour enchainer les captures successives
    while (true) {
      // 1) Si on est déjà sur la destination finale

      if (curX === x2 && curY === y2) {

        // Si ce n'est pas la même case que la case de départ alors on checke si elle est libre
        if ((x2 !== x1 || y2 !== y1) && board[y2][x2]) {
          statusElement.textContent = "La case d'arrivée n'est pas libre."; 
          return null;
        }
          return captured; // 
        }
    
      let nextX = curX + dx;
      let nextY = curY + dy;
  
      // 2) Vérification si on dépasse les limites du plateau
      if (nextX < 0 || nextX >= boardSize || nextY < 0 || nextY >= boardSize) {
        statusElement.textContent = "Mouvement hors du plateau (pion non promu).";
        return null;
      }
  
      // 3) Si la case suivante est vide
      if (!board[nextY][nextX]) {

        // a) Si c'est exactement la case finale, alors c'est un déplacement simple
        if (nextX === x2 && nextY === y2) {
          return captured; 
        }
        // b) Sinon, on ne peut pas « sauter » une case vide s'il n'y a pas d'ennemi
        statusElement.textContent =
          "Pion non promu : Il ne peut pas sauter de case vide s'il n'y a pas d'ennemi.";
        return null;
      } else {
        // 4) Sinon si la case suivante est occupée par un pion
        const occupant = board[nextY][nextX];
        if (occupant.player === piece.player) { // Pion allié
          statusElement.textContent =
            "La voie est bloquée par un allié (pion non promu).";
          return null;
        } else {
          // a) occupant est un pion adverse alors => tentative de capture
          let jumpX = nextX + dx;
          let jumpY = nextY + dy;
  
          if (
            jumpX < 0 || jumpX >= boardSize ||
            jumpY < 0 || jumpY >= boardSize
          ) {
            statusElement.textContent =
              "Impossible de sauter, hors du plateau (pion non promu).";
            return null;
          }
          if (board[jumpY][jumpX]) {
            statusElement.textContent =
              "Impossible de sauter, la case après l'ennemi n'est pas libre.";
            return null;
          }
  
          // b) On capture le pion ennemi
          captured.push({ cx: nextX, cy: nextY });
          curX = jumpX;
          curY = jumpY;
  
          // c) Ensuite on vérifie si on vient d'atteindre la case finale
          if (curX === x2 && curY === y2) {
            return captured;
          }
          // Sinon, la boucle continue => on vérifie la prochaine case
        }
      }
  
      // 5) Si le mouvement est trop long/loin
      if ((dx > 0 && curX > x2) || (dx < 0 && curX < x2)) {
        statusElement.textContent = "Mouvement trop long (pion non promu).";
        return null;
      }
      if ((dy > 0 && curY > y2) || (dy < 0 && curY < y2)) {
        statusElement.textContent = "Mouvement trop long (pion non promu).";
        return null;
      }
    }
  }
  
  // Logique de déplacement/capture pour les pions dames
  // Les dames peuvent avancer/reculer de plusieurs cases, enchaîner les captures
  function getCapturedPositionsForDame(x1, y1, x2, y2, piece) {
    let captured = [];
    let dx = Math.sign(x2 - x1);
    let dy = Math.sign(y2 - y1);

    let curX = x1;
    let curY = y1;

    while (true) {
      let nextX = curX + dx;
      let nextY = curY + dy;

      // Si le pion atteint la case d'arrivée !
      if (nextX === x2 && nextY === y2) {

        // Il faut qu'elle soit vide
        if (board[y2][x2]) {
          statusElement.textContent = "La case d'arrivée n'est pas libre (dame).";
          return null;
        }
        return captured;
      }

      // Si on est hors du plateau :
      if (nextX < 0 || nextX >= boardSize || nextY < 0 || nextY >= boardSize) {
        statusElement.textContent = "Mouvement hors du plateau (dame).";
        return null;
      }

      // Si la case suivante est vide, la dame continue
      if (!board[nextY][nextX]) {
        curX = nextX;
        curY = nextY;
      } else {

        // Meme principe que les pions non promus
        const occupant = board[nextY][nextX];
        if (occupant.player === piece.player) {
          statusElement.textContent = "La voie est bloquée par un allié (dame).";
          return null;
        } else {

          // Else un pion ennemi, on capture
          let jumpX = nextX + dx;
          let jumpY = nextY + dy;
          if (
            jumpX < 0 || jumpX >= boardSize ||
            jumpY < 0 || jumpY >= boardSize
          ) {
            statusElement.textContent = "Impossible de sauter, hors du plateau (dame).";
            return null;
          }
          if (board[jumpY][jumpX]) {
            statusElement.textContent = "Impossible de sauter, la case après l'ennemi n'est pas libre (dame).";
            return null;
          }
          captured.push({ cx: nextX, cy: nextY });
          curX = jumpX;
          curY = jumpY;

          if (curX === x2 && curY === y2) {
            return captured;
          }
        }
      }

      // Meme principe que les pions non promus : si le mouvement est trop long
      if ((dx > 0 && curX > x2) || (dx < 0 && curX < x2)) {
        statusElement.textContent = "Mouvement trop long (dame).";
        return null;
      }
      if ((dy > 0 && curY > y2) || (dy < 0 && curY < y2)) {
        statusElement.textContent = "Mouvement trop long (dame).";
        return null;
      }
    }
  }

  // ====================== GESTION DES MOUVEMENTS DE L'ORDINATEUR  ======================
  function makeComputerMove() {
    let bestMove = null;
    let bestScore = -Infinity;
    
    // Fonction pour évaluer le plateau
    function evaluateBoard(testBoard) {
      let score = 0;
      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          const piece = testBoard[y][x];
          if (piece) {
            const pieceValue = piece.promoted ? 3 : 1; 

            // Joueur 2 => score positif, Joueur 1 => score négatif
            score += (piece.player === 2 ? pieceValue : -pieceValue);
          }
        }
      }
      return score;
    }
    
    // Fonction pour cloner le plateau : éviter les effets de bord de l'ordinateur
    function cloneBoard(sourceBoard) {
      return sourceBoard.map(row => row.map(cell => (cell ? { ...cell } : null)));
    }

    // L'ordinateur simule un déplacement pour évaluer le meilleur coup possible
    function simulateMove(originalBoard, move) {
      const newBoard = cloneBoard(originalBoard);
      newBoard[move.toY][move.toX] = newBoard[move.fromY][move.fromX];
      newBoard[move.fromY][move.fromX] = null;
      move.captured.forEach(({ cx, cy }) => {
        newBoard[cy][cx] = null;
      });
      return newBoard;
    }

    // On évalue tous les déplacements possibles de l'ordinateur
    for (let y = 0; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        const piece = board[y][x];
        if (piece && piece.player === 2) {
          for (let newY = 0; newY < boardSize; newY++) {
            for (let newX = 0; newX < boardSize; newX++) {
              if (newX === x && newY === y) continue;
              const captured = getCapturedPositions(x, y, newX, newY);
              if (captured !== null) {

                const move = { // L'ordi stocke le coup
                  fromX: x,
                  fromY: y,
                  toX: newX,
                  toY: newY,
                  captured
                };

                // L'ordi tente de simuler le coup et affecte un score
                const newBoard = simulateMove(board, move);
                const score = evaluateBoard(newBoard);
                if (score > bestScore) {
                  bestScore = score;
                  bestMove = move;
                }
              }
            }
          }
        }
      }
    }

    // Si l'ordinateur n'a pas trouvé de coup valide, appel de la fonction checkWin  
    if (!bestMove) {
      if (checkWin()) {
        renderBoard();
        return;
      }
      currentPlayer = 1;
      updateStatus();
      renderBoard();
      return;
    }

    // L'ordinateur applique le meilleur coup
    board[bestMove.toY][bestMove.toX] = board[bestMove.fromY][bestMove.fromX];
    board[bestMove.fromY][bestMove.fromX] = null;
    bestMove.captured.forEach(({ cx, cy }) => {
      board[cy][cx] = null;
    });

    // Promotion du pion si on arrive sur la dernière rangée
    if (board[bestMove.toY][bestMove.toX].player === 2 && bestMove.toY === 0) {
      board[bestMove.toY][bestMove.toX].promoted = true;
    }

    if (checkWin()) {
      renderBoard();
      return;
    }
    currentPlayer = 1;
    updateStatus();
    renderBoard();
  }

  // ====================== VERIFICATION DE FIN DE PARTIE ======================
  function checkWin() {
    const opponent = currentPlayer === 1 ? 2 : 1;
    const opponentPieces = board.flat().filter(p => p && p.player === opponent);
    
    // 1) L'adversaire n'a plus de pièces
    if (opponentPieces.length === 0) {
      statusElement.textContent = "Joueur " + currentPlayer + " a gagné !";
      showConfetti();
      openWinnerModal();
      return true;
    }
    
    // 2) Si l''adversaire ne peut plus bouger ses pions : exemple qu'il soit bloqué
    let canMove = false;
    const savedPlayer = currentPlayer;
    currentPlayer = opponent;
    for (let y = 0; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        const piece = board[y][x];
        if (piece && piece.player === opponent) {
          for (let newY = 0; newY < boardSize; newY++) {
            for (let newX = 0; newX < boardSize; newX++) {
              if (newX === x && newY === y) continue;
              const captured = getCapturedPositions(x, y, newX, newY);
              if (captured !== null) {
                canMove = true;
                break;
              }
            }
            if (canMove) break;
          }
        }
        if (canMove) break;
      }
      if (canMove) break;
    }
    currentPlayer = savedPlayer;
    
    if (!canMove) {
      statusElement.textContent = "Joueur " + currentPlayer + " a gagné !"; // On affiche le gagnant
      showConfetti();
      openWinnerModal();
      return true;
    }
    
    // 3) Match nul s'il ne reste que des dames en fin de partie : exemple chaque adversaire en a une
    const allPieces = board.flat().filter(p => p !== null);
    const allArePromoted = allPieces.every(piece => piece.promoted);
    const player1Pieces = allPieces.filter(piece => piece.player === 1);
    const player2Pieces = allPieces.filter(piece => piece.player === 2);
    if (allArePromoted && player1Pieces.length > 0 && player2Pieces.length > 0) {
      statusElement.textContent = "Match nul, Vous pouvez faire mieux ! Souhaitez-vous rejouer une nouvelle partie ?";
      const modalContent = winnerModal.querySelector('.modal-content');
      modalContent.innerHTML = `
        <h2>Match nul, Vous pouvez faire mieux !</h2>
        <p>Souhaitez-vous rejouer une nouvelle partie ?</p>
        <button id="popup-replay" class="btn-3d" style="margin-right: 10px;">Rejouer ?</button>
        <button id="popup-no" class="btn-3d" style="margin-left: 10px;">Non</button>
      `;
      modalContent.querySelector('#popup-no').addEventListener('click', () => {
        window.location.href = "../index.html";
      });
      modalContent.querySelector('#popup-replay').addEventListener('click', () => {
        board = [];
        currentPlayer = 1;
        closeWinnerModal();
        initBoard();
        statusElement.textContent = "Sélectionnez un pion pour jouer.";
      });
      openWinnerModal();
      return true;
    }
    
    return false;
  }

  // ====================== MISES A JOURS DES STATUTS EN BAS DU PLATEAU DE JEU ======================
  function updateStatus() {
    statusElement.textContent = "Tour du joueur " + currentPlayer;
  }

  // Fonction pour afficher les confettis dans la popup lorsqu'un joueur gagne
  function showConfetti() {
    const container = winnerModal.querySelector('.modal-content') || winnerModal;
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);
    
    const myConfetti = confetti.create(canvas, { resize: true });
    const duration = 3500;
    const end = Date.now() + duration;
    
    (function frame() {
      myConfetti({
        particleCount: 5,
        startVelocity: 30,
        spread: 360,
        origin: { x: Math.random(), y: Math.random() }
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        canvas.remove();
      }
    })();
  }

  function openWinnerModal() {
    winnerModal.style.display = "flex"; // Flex pour adapter le contenu
  }
  function closeWinnerModal() {
    winnerModal.style.display = "none";
  }

  // ====================== FONCTION POUR LES POPUP DE CONFIRMATION  ======================
  function showConfirmationPopup(message, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.style.display = 'flex';

    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');

    modalContent.innerHTML = `
      <h2>${message}</h2>
      <div style="margin: 20px 0;">
        <button id="confirm-yes" class="btn-3d" style="margin-right: 10px;">Oui</button>
        <button id="confirm-no" class="btn-3d" style="margin-left: 10px;">Non</button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    modalContent.querySelector('#confirm-yes').addEventListener('click', () => {
      document.body.removeChild(modal);
      if (onConfirm) onConfirm();
    });
    modalContent.querySelector('#confirm-no').addEventListener('click', () => {
      document.body.removeChild(modal);
      if (onCancel) onCancel();
    });
  }

  function showNewGameModePopup() {
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.style.display = 'flex';

    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');
    modalContent.innerHTML = `
      <h2>Choisissez un mode de jeu</h2>
      <div style="margin: 20px 0;">
        <button id="mode-online" class="btn-3d" style="margin-bottom: 10px;">
          <i class="fa-solid fa-earth-americas" style="margin-right: 10px;"></i>Jouer en ligne
        </button>
        <button id="mode-ai" class="btn-3d" style="margin-top: 10px;">
          <i class="fa-solid fa-robot" style="margin-right: 10px;"></i>Jouer contre l'ordinateur
        </button>
      </div>
    `;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    modalContent.querySelector('#mode-online').addEventListener('click', () => {
      document.body.removeChild(modal);
      window.location.href = "partie.html?mode=online";
    });
    modalContent.querySelector('#mode-ai').addEventListener('click', () => {
      document.body.removeChild(modal);
      window.location.href = "partie.html?mode=ai";
    });
  }

  // ====================== BOUTONS DE CONTROLE ======================
  newGameButton.addEventListener("click", () => {
    showConfirmationPopup("Voulez-vous commencer une nouvelle partie ?", () => {
      showNewGameModePopup();
    });
  });

  resetGameButton.addEventListener("click", () => {
    showConfirmationPopup("Voulez-vous réinitialiser la partie ?", () => {
      board = [];
      currentPlayer = 1;
      closeWinnerModal();
      initBoard();
      statusElement.textContent = "Sélectionnez un pion pour jouer.";
    });
  });

  abandonButton.addEventListener("click", () => {
    showConfirmationPopup("Voulez-vous abandonner la partie ?", () => {
      window.location.href = "../index.html";
    });
  });

  replayPopupButton.addEventListener("click", () => {
    board = [];
    currentPlayer = 1;
    closeWinnerModal();
    initBoard();
    statusElement.textContent = "Sélectionnez un pion pour jouer.";
  });

  // Initialisation du jeu
  initBoard();
});
