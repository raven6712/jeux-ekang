let plateau = {
  nord: [5, 5, 5, 5, 5, 5, 5],  // index 0 = case 1 de NORD (gauche de NORD)
  sud:  [5, 5, 5, 5, 5, 5, 5],  // index 6 = case 1 de SUD  (gauche de SUD = droite écran)
};

let scoreNord = 0;
let scoreSud  = 0;
let tourActuel = 'sud';    // 'nord' ou 'sud'
let modeJeu   = 'ami';     // 'ami' ou 'ordi'
let animEnCours = false;

// ===========================================================
//   DÉMARRER / RESET
// ===========================================================

function demarrerJeu(mode) {
  modeJeu = mode;
  plateau = {
    nord: [5, 5, 5, 5, 5, 5, 5],
    sud:  [5, 5, 5, 5, 5, 5, 5],
  };
  scoreNord = 0;
  scoreSud  = 0;
  tourActuel = 'sud';
  animEnCours = false;

  document.getElementById('menu').style.display = 'none';
  document.getElementById('jeu').style.display  = 'flex';

  if (mode === 'ami') {
    document.getElementById('nom-nord').textContent = 'JOUEUR NORD';
    document.getElementById('nom-sud').textContent  = 'JOUEUR SUD';
  } else {
    document.getElementById('nom-nord').textContent = 'ORDINATEUR';
    document.getElementById('nom-sud').textContent  = 'JOUEUR SUD';
  }

  afficherPlateau();
  mettreAJourUI();
}

function retourMenu() {
  document.getElementById('jeu').style.display  = 'none';
  document.getElementById('menu').style.display = 'flex';
  fermerVictoire();
}

// ===========================================================
//   AFFICHER LE PLATEAU
// ===========================================================

function afficherPlateau() {
  afficherRangee('nord', 'rangee-nord');
  afficherRangee('sud',  'rangee-sud');
}

function afficherRangee(camp, idRangee) {
  const rangee = document.getElementById(idRangee);
  rangee.innerHTML = '';

  // Pour NORD : on affiche de gauche à droite (index 0 = case 1 de NORD)
  // Pour SUD  : on affiche de droite à gauche (index 6 = case 1 de SUD)
  // Mais visuellement on veut que SUD voie ses cases dans le bon sens :
  // case 7 de SUD à gauche, case 1 à droite → on affiche index 0 à 6 normalement
  // et on considère que l'index 6 = case 1 de SUD

  for (let i = 0; i < 7; i++) {
    const div = document.createElement('div');
    div.classList.add('case');

    // Numéro affiché de la case (1 à 7, case 1 = plus à gauche du joueur)
    let numCase;
    if (camp === 'nord') {
      numCase = i + 1; // index 0 = case 1
    } else {
      numCase = 7 - i; // index 0 = case 7 pour SUD, index 6 = case 1
    }
    div.setAttribute('data-num', numCase);
    div.setAttribute('data-camp', camp);
    div.setAttribute('data-index', i);

    // Graines
    const nbGraines = plateau[camp][i];
    for (let g = 0; g < Math.min(nbGraines, 16); g++) {
      const graine = document.createElement('div');
      graine.classList.add('graine');
      div.appendChild(graine);
    }
    // Si plus de 16 graines, afficher un compteur
    if (nbGraines > 16) {
      div.innerHTML = `<span style="color:var(--or);font-size:1.1rem;font-weight:bold;">${nbGraines}</span>`;
    }

    // Clic
    div.addEventListener('click', () => clicCase(camp, i));

    rangee.appendChild(div);
  }
}

// ===========================================================
//   METTRE À JOUR L'UI (scores, tour)
// ===========================================================

function mettreAJourUI() {
  document.getElementById('score-nord').textContent = scoreNord;
  document.getElementById('score-sud').textContent  = scoreSud;

  const infoNord = document.getElementById('info-nord');
  const infoSud  = document.getElementById('info-sud');
  infoNord.style.border = tourActuel === 'nord' ? '2px solid var(--or)' : '1px solid var(--bois)';
  infoSud.style.border  = tourActuel === 'sud'  ? '2px solid var(--or)' : '1px solid var(--bois)';

  let nomTour = tourActuel === 'nord'
    ? document.getElementById('nom-nord').textContent
    : document.getElementById('nom-sud').textContent;
  document.getElementById('tour-info').textContent = `Tour de ${nomTour}`;
}

function log(msg) {
  document.getElementById('log').textContent = msg;
}

// ===========================================================
//   CLIC SUR UNE CASE
// ===========================================================

function clicCase(camp, index) {
  if (animEnCours) return;

  // Le joueur ne peut jouer que dans son propre camp
  if (camp !== tourActuel) {
    afficherAlerte('⛔', 'Mauvais camp !', 'Vous devez choisir une case dans votre propre territoire.');
    return;
  }

  // L'ordinateur joue tout seul
  if (modeJeu === 'ordi' && tourActuel === 'nord') return;

  jouerCoup(camp, index);
}

// ===========================================================
//   JOUER UN COUP (avec animation)
// ===========================================================

function jouerCoup(camp, index) {
  const nbGraines = plateau[camp][index];

  // Vérification : case vide
  if (nbGraines === 0) {
    afficherAlerte('🚫', 'Case vide', 'Vous ne pouvez pas jouer une case vide !');
    return;
  }

  // Vérification interdit : case 7 avec 1 ou 2 graines destinées à l'adversaire
  // (On vérifie ça plus précisément après calcul de la distribution)
  const adversaire = camp === 'nord' ? 'sud' : 'nord';

  // --- Interdiction : la case 7 ne peut pas semer 1 ou 2 graines chez l'adversaire ---
  // Case 7 = index 0 pour les deux camps (la plus à droite du joueur = la 7ème depuis sa gauche)
  // En fait case 7 = index 6 dans notre tableau pour les deux camps
  // (index 0 = case 1, index 6 = case 7)
  const estCase7 = (index === 6);
  if (estCase7 && (nbGraines === 1 || nbGraines === 2)) {
    // Vérifier si un coup de solidarité est en jeu
    const campAdverse = adversaire;
    const totalAdverse = plateau[campAdverse].reduce((a,b) => a+b, 0);
    if (totalAdverse === 0) {
      // solidarité : doit distribuer max mais l'interdit reste
      // on laisse jouer mais les graines vont à l'adversaire (géré plus bas)
    } else {
      afficherAlerte('🚫', 'Coup interdit !',
        `La case 7 ne peut pas envoyer seulement 1 ou 2 graines chez l'adversaire. Choisissez une autre case.`);
      return;
    }
  }

  // Vérification solidarité : si camp adverse vide
  const totalAdverse = plateau[adversaire].reduce((a,b) => a+b, 0);
  if (totalAdverse === 0) {
    // Doit envoyer au moins 7 graines chez l'adversaire
    const grGagne = simulerGrainesChezAdversaire(camp, index);
    if (grGagne < 7) {
      // Cherche s'il existe un coup qui envoie 7+
      const meilleurCoup = trouverCoupSolidarite(camp);
      if (meilleurCoup !== -1) {
        afficherAlerte('🤝', 'Solidarité !',
          `Le camp adverse est vide. Vous devez jouer un coup qui envoie au moins 7 graines. Essayez une autre case.`);
        return;
      }
      // Sinon on joue quand même le meilleur coup possible
    }
  }

  // Tout est bon : on anime le coup
  animEnCours = true;
  highlightCase(camp, index);
  log(`${camp.toUpperCase()} joue la case ${index+1} (${nbGraines} graines)...`);

  // On vide la case
  plateau[camp][index] = 0;

  // Calculer la séquence de dépôts
  const sequence = calculerSequence(camp, index, nbGraines);

  // Animer les dépôts un par un
  animerSequence(sequence, camp, index, nbGraines, () => {
    // Fin de l'animation : calcul des prises
    const derniere = sequence[sequence.length - 1];
    effectuerPrises(derniere.camp, derniere.index);
    afficherPlateau();
    mettreAJourUI();

    // Vérifier fin de partie
    if (verifierFinPartie()) return;

    // Changer de tour
    tourActuel = camp === 'nord' ? 'sud' : 'nord';
    mettreAJourUI();
    animEnCours = false;

    // Si mode ordi et c'est le tour de l'ordi
    if (modeJeu === 'ordi' && tourActuel === 'nord') {
      setTimeout(jouerOrdinateur, 900);
    }
  });
}

// ===========================================================
//   CALCULER LA SÉQUENCE DE DÉPÔTS
// ===========================================================
// Retourne un tableau [{camp, index}] = liste des cases où déposer une graine

function calculerSequence(camp, caseDep, nbGraines) {
  const sequence = [];
  let graines = nbGraines;

  // Direction : dans son propre camp, on va de la case choisie vers la droite
  // (on suit la règle : ramasser et déposer droite→gauche dans son camp, puis gauche→droite chez adverse)
  // On simplifie : on numérote les cases dans l'ordre du parcours

  // Parcours : camp du joueur de droite à gauche (index croissant vers 0),
  // puis camp adverse de gauche à droite (index 0 vers 6)
  // MAIS on saute la case de départ si on fait un tour complet

  const tourComplet = nbGraines >= 14;

  // Construire l'ordre de parcours à partir de la case suivante
  let parcours = [];

  // Camp du joueur : cases de caseDep-1 jusqu'à 0 (vers la gauche = vers case 1)
  for (let i = caseDep - 1; i >= 0; i--) {
    parcours.push({ camp, index: i });
  }
  // Camp adverse : cases 0 jusqu'à 6 (de gauche à droite)
  const adv = camp === 'nord' ? 'sud' : 'nord';
  for (let i = 0; i < 7; i++) {
    parcours.push({ camp: adv, index: i });
  }
  // Camp du joueur : cases 6 jusqu'à caseDep+1 (retour droite)
  for (let i = 6; i > caseDep; i--) {
    parcours.push({ camp, index: i });
  }
  // La case de départ elle-même (si tour complet, on la saute)
  if (tourComplet) {
    // on ajoute une entrée "saut" fictive qu'on ne comptera pas
  } else {
    parcours.push({ camp, index: caseDep }); // ne sera pas utilisée normalement
  }

  // Remplir la séquence
  let pos = 0;
  while (graines > 0) {
    const cell = parcours[pos % parcours.length];
    // Si tour complet, on saute la case de départ
    if (tourComplet && cell.camp === camp && cell.index === caseDep) {
      pos++;
      continue;
    }
    sequence.push({ camp: cell.camp, index: cell.index });
    graines--;
    pos++;
  }

  return sequence;
}

// ===========================================================
//   ANIMER LA SÉQUENCE
// ===========================================================

function animerSequence(sequence, campDep, indexDep, nbGraines, callback) {
  // Délai entre chaque graine (ms) - plus lent si peu de graines
  const delai = nbGraines > 10 ? 80 : 150;

  // Appliquer les dépôts un à un
  let i = 0;
  function etape() {
    if (i >= sequence.length) {
      callback();
      return;
    }
    const { camp, index } = sequence[i];
    plateau[camp][index]++;
    afficherPlateau();
    surlignerCase(camp, index);
    i++;
    setTimeout(etape, delai);
  }
  etape();
}

// Surligne brièvement la case active
function surlignerCase(camp, index) {
  const rangeeId = camp === 'nord' ? 'rangee-nord' : 'rangee-sud';
  const cases = document.getElementById(rangeeId).children;
  for (let c of cases) {
    c.classList.remove('active');
    if (parseInt(c.getAttribute('data-index')) === index) {
      c.classList.add('active');
    }
  }
}

function highlightCase(camp, index) {
  const rangeeId = camp === 'nord' ? 'rangee-nord' : 'rangee-sud';
  const cases = document.getElementById(rangeeId).children;
  for (let c of cases) {
    c.classList.remove('selectionnee');
    if (parseInt(c.getAttribute('data-index')) === index) {
      c.classList.add('selectionnee');
    }
  }
}

// ===========================================================
//   EFFECTUER LES PRISES
// ===========================================================

function effectuerPrises(dernierCamp, dernierIndex) {
  const campJoueur = tourActuel;
  const campAdverse = campJoueur === 'nord' ? 'sud' : 'nord';

  // Les prises ne se font que dans le camp adverse
  if (dernierCamp !== campAdverse) {
    log('Aucune prise.');
    return;
  }

  // Cas spécial : si la distribution se termine en case 1 adverse après ≥1 tour complet
  // (cela nécessite d'avoir distribué 14, 21, 28... graines)
  // Dans ce cas on prend juste 1 graine
  const estCase1Adverse = (dernierIndex === 0); // index 0 = case 1 pour les deux camps

  // Vérifier si c'est une arrivée en case 1 après tour complet : on ne peut pas savoir ici
  // sans le contexte initial. On simplifie : la règle est que si on finit en case 1 adverse
  // avec une prise possible, on ne prend pas (sauf si incluse dans chaîne).

  const nbFinale = plateau[campAdverse][dernierIndex];

  // Prise possible : la case contient 2, 3 ou 4 graines (1 à 3 avant + la graine déposée)
  if (nbFinale < 2 || nbFinale > 4) {
    log('Pas de prise (case finale : ' + nbFinale + ' graines).');
    return;
  }

  // Pas de prise directe en case 1 (sauf chaîne)
  if (estCase1Adverse) {
    log('Fin en case 1 adverse : pas de prise directe.');
    return;
  }

  // Vérifier interdiction de vider le camp adverse complètement
  // Simuler la prise et voir si le camp serait vide
  if (simulerVideCampAdverse(campAdverse, dernierIndex)) {
    afficherAlerte('🚫', 'Coup interdit !',
      `Ce coup viderait complètement le camp adverse. Aucune prise n'est effectuée.`);
    return;
  }

  // Effectuer la prise en chaîne (de la case finale vers la case 7 du joueur, c'est-à-dire
  // en remontant les cases adjacentes)
  let priseTotale = 0;
  let idx = dernierIndex;

  while (idx >= 0 && idx < 7) {
    const nb = plateau[campAdverse][idx];
    if (nb >= 2 && nb <= 4) {
      // Pas de prise directe en case 1 (index 0) si c'est la première prise
      if (idx === 0 && priseTotale === 0) break;
      priseTotale += nb;
      plateau[campAdverse][idx] = 0;
      idx++; // on remonte vers la case 7 de l'adversaire (vers index 6)
    } else {
      break;
    }
  }

  if (priseTotale > 0) {
    if (campJoueur === 'nord') {
      scoreNord += priseTotale;
    } else {
      scoreSud += priseTotale;
    }
    log(`✅ Prise ! +${priseTotale} graines récoltées.`);
  }
}

// Vérifie si une prise viderait complètement le camp adverse
function simulerVideCampAdverse(campAdverse, dernierIndex) {
  const copie = [...plateau[campAdverse]];
  let idx = dernierIndex;
  while (idx >= 0 && idx < 7) {
    const nb = copie[idx];
    if (nb >= 2 && nb <= 4) {
      if (idx === 0) break;
      copie[idx] = 0;
      idx++;
    } else break;
  }
  return copie.every(n => n === 0);
}

// Simule combien de graines atteignent le camp adverse
function simulerGrainesChezAdversaire(camp, index) {
  const seq = calculerSequence(camp, index, plateau[camp][index]);
  const adv = camp === 'nord' ? 'sud' : 'nord';
  return seq.filter(s => s.camp === adv).length;
}

// Trouve une case qui envoie ≥7 graines chez l'adversaire
function trouverCoupSolidarite(camp) {
  for (let i = 0; i < 7; i++) {
    if (plateau[camp][i] > 0) {
      if (simulerGrainesChezAdversaire(camp, i) >= 7) return i;
    }
  }
  return -1;
}

// ===========================================================
//   FIN DE PARTIE
// ===========================================================

function verifierFinPartie() {
  const totalNord = plateau.nord.reduce((a,b) => a+b, 0);
  const totalSud  = plateau.sud.reduce((a,b) => a+b, 0);
  const totalPlateau = totalNord + totalSud;

  // Condition 1 : 40+ graines
  if (scoreNord >= 40) { afficherVictoire('nord'); return true; }
  if (scoreSud  >= 40) { afficherVictoire('sud');  return true; }

  // Condition 2 : moins de 10 graines sur le tablier
  if (totalPlateau < 10) {
    scoreNord += totalNord;
    scoreSud  += totalSud;
    plateau.nord = [0,0,0,0,0,0,0];
    plateau.sud  = [0,0,0,0,0,0,0];
    afficherPlateau();
    mettreAJourUI();
    if (scoreNord > scoreSud) afficherVictoire('nord');
    else if (scoreSud > scoreNord) afficherVictoire('sud');
    else afficherVictoire('nul');
    return true;
  }

  // Condition 3 : solidarité impossible (camp adverse vide ET impossible d'y envoyer des graines)
  const adversaire = tourActuel === 'nord' ? 'sud' : 'nord';
  const totalAdv = plateau[adversaire].reduce((a,b) => a+b, 0);
  if (totalAdv === 0) {
    // Chercher si on peut envoyer des graines
    let peutEnvoyer = false;
    for (let i = 0; i < 7; i++) {
      if (plateau[tourActuel][i] > 0 && simulerGrainesChezAdversaire(tourActuel, i) > 0) {
        peutEnvoyer = true;
        break;
      }
    }
    if (!peutEnvoyer) {
      // Fin : les graines restantes reviennent au propriétaire
      scoreNord += plateau.nord.reduce((a,b) => a+b, 0);
      scoreSud  += plateau.sud.reduce((a,b) => a+b, 0);
      plateau.nord = [0,0,0,0,0,0,0];
      plateau.sud  = [0,0,0,0,0,0,0];
      afficherPlateau();
      mettreAJourUI();
      if (scoreNord > scoreSud) afficherVictoire('nord');
      else if (scoreSud > scoreNord) afficherVictoire('sud');
      else afficherVictoire('nul');
      return true;
    }
  }

  return false;
}

// ===========================================================
//   ORDINATEUR (IA simple)
// ===========================================================

function jouerOrdinateur() {
  if (tourActuel !== 'nord') return;

  // Stratégie : choisir la case qui rapporte le plus de graines
  let meilleurScore = -1;
  let meilleurIndex = -1;

  for (let i = 0; i < 7; i++) {
    if (plateau.nord[i] === 0) continue;

    // Simuler le coup
    const sim = simulerCoup('nord', i);
    if (sim > meilleurScore) {
      meilleurScore = sim;
      meilleurIndex = i;
    }
  }

  if (meilleurIndex === -1) {
    // Aucun coup possible → fin
    verifierFinPartie();
    return;
  }

  log(`L'ordinateur joue la case ${meilleurIndex + 1}...`);
  jouerCoup('nord', meilleurIndex);
}

// Simule un coup et retourne les graines prises
function simulerCoup(camp, index) {
  if (plateau[camp][index] === 0) return -1;

  // Copie du plateau
  const copieNord = [...plateau.nord];
  const copieSud  = [...plateau.sud];

  const seq = calculerSequence(camp, index, plateau[camp][index]);
  const copie = { nord: copieNord, sud: copieSud };
  copie[camp][index] = 0;
  for (const s of seq) copie[s.camp][s.index]++;

  const derniere = seq[seq.length - 1];
  const adv = camp === 'nord' ? 'sud' : 'nord';
  if (derniere.camp !== adv) return 0;

  let prise = 0;
  let idx = derniere.index;
  while (idx >= 0 && idx < 7) {
    const nb = copie[adv][idx];
    if (nb >= 2 && nb <= 4) {
      if (idx === 0 && prise === 0) break;
      prise += nb;
      copie[adv][idx] = 0;
      idx++;
    } else break;
  }
  return prise;
}

// ===========================================================
//   ALERTES CUSTOM
// ===========================================================

function afficherAlerte(icone, titre, message) {
  document.getElementById('alerte-icone').textContent   = icone;
  document.getElementById('alerte-titre').textContent   = titre;
  document.getElementById('alerte-message').textContent = message;
  document.getElementById('alerte-overlay').classList.add('visible');
}

function fermerAlerte() {
  document.getElementById('alerte-overlay').classList.remove('visible');
}

// ===========================================================
//   VICTOIRE
// ===========================================================

function afficherVictoire(gagnant) {
  let nom, detail;
  if (gagnant === 'nul') {
    nom    = '🤝 Égalité !';
    detail = `${scoreNord} – ${scoreSud} | Personne ne remporte la partie.`;
  } else {
    nom    = gagnant === 'nord'
      ? document.getElementById('nom-nord').textContent
      : document.getElementById('nom-sud').textContent;
    const sc = gagnant === 'nord' ? scoreNord : scoreSud;
    detail = `Avec ${sc} graines récoltées sur 70.`;
  }

  document.getElementById('victoire-nom').textContent    = nom;
  document.getElementById('victoire-detail').textContent = detail;
  document.getElementById('victoire-overlay').classList.add('visible');

  if (gagnant !== 'nul') lancerConfettis();
}

function fermerVictoire() {
  document.getElementById('victoire-overlay').classList.remove('visible');
}

function lancerConfettis() {
  const couleurs = ['#D4A017', '#2D6A3F', '#B03030', '#C8915A', '#F5ECD7', '#fff'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.classList.add('confetti-piece');
    c.style.left       = Math.random() * 100 + 'vw';
    c.style.top        = '-10px';
    c.style.background = couleurs[Math.floor(Math.random() * couleurs.length)];
    c.style.animationDelay    = Math.random() * 1.5 + 's';
    c.style.animationDuration = (1.5 + Math.random()) + 's';
    c.style.width  = (8 + Math.random() * 12) + 'px';
    c.style.height = (8 + Math.random() * 12) + 'px';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3500);
  }
}