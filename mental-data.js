/* =========================================================
   Exercices MENTAUX (onglet 🧠 Mental, lu par mental.js).
   On peut modifier ce fichier à la main : textes, étapes, minuteurs.
   Exemples écrits par Claude (pas de source PDF/web), validés tels quels
   par l'utilisateur le 2026-11-16. Ne jamais changer un "id" existant
   (l'historique des exercices faits s'appuie dessus).
   Minuteur : null | {type:"simple", secondes} |
   {type:"respiration", cycles, phases:[{label, secondes, action: in|out|hold}]}
   ========================================================= */
window.DONNEES_MENTAL = {
  "mention": "Contenu d’entraînement sportif. Il ne remplace pas un avis médical ou psychologique.",
  "categories": [
    {
      "id": "respiration",
      "nom": "Respiration"
    },
    {
      "id": "routine",
      "nom": "Routine pré-coup"
    },
    {
      "id": "pression",
      "nom": "Gestion de la pression"
    },
    {
      "id": "visualisation",
      "nom": "Visualisation"
    },
    {
      "id": "concentration",
      "nom": "Concentration"
    },
    {
      "id": "confiance",
      "nom": "Confiance / discours interne"
    },
    {
      "id": "analyse",
      "nom": "Analyse post-partie"
    }
  ],
  "exercices": [
    {
      "id": "resp-coherence",
      "titre": "Cohérence cardiaque 5-5",
      "categorie": "respiration",
      "duree": 5,
      "lieu": "Partout",
      "objectif": "Faire redescendre ton rythme cardiaque et retrouver un état calme et stable, la base de tout le travail mental.",
      "etapes": [
        "Assieds-toi ou reste debout, pieds bien ancrés, épaules relâchées.",
        "Inspire par le nez pendant 5 secondes en gonflant d’abord le ventre.",
        "Expire doucement par la bouche pendant 5 secondes, comme si tu soufflais sur une bougie sans l’éteindre.",
        "Suis le minuteur pendant 5 minutes sans chercher à forcer : le rythme suffit.",
        "À la fin, note ce qui a changé : épaules, mâchoire, mains, pensées."
      ],
      "conseil": "Fais-le 3 fois par jour pendant une semaine : le jour du tournoi, ton corps connaîtra déjà le chemin vers le calme.",
      "minuteur": {
        "type": "respiration",
        "cycles": 30,
        "phases": [
          {
            "label": "Inspire",
            "secondes": 5,
            "action": "in"
          },
          {
            "label": "Expire",
            "secondes": 5,
            "action": "out"
          }
        ]
      }
    },
    {
      "id": "resp-carree",
      "titre": "Respiration carrée 4-4-4-4",
      "categorie": "respiration",
      "duree": 3,
      "lieu": "Partout",
      "objectif": "Reprendre le contrôle quand l’adrénaline monte, en occupant ton esprit avec un rythme simple et précis.",
      "etapes": [
        "Inspire 4 secondes par le nez.",
        "Bloque poumons pleins 4 secondes, sans crispation.",
        "Expire 4 secondes par la bouche.",
        "Bloque poumons vides 4 secondes.",
        "Répète pendant 3 minutes en visualisant un carré qui se dessine."
      ],
      "conseil": "Idéal sur le trajet vers le golf ou au parking, avant de sortir de la voiture.",
      "minuteur": {
        "type": "respiration",
        "cycles": 11,
        "phases": [
          {
            "label": "Inspire",
            "secondes": 4,
            "action": "in"
          },
          {
            "label": "Bloque",
            "secondes": 4,
            "action": "hold"
          },
          {
            "label": "Expire",
            "secondes": 4,
            "action": "out"
          },
          {
            "label": "Bloque",
            "secondes": 4,
            "action": "hold"
          }
        ]
      }
    },
    {
      "id": "resp-expiration-longue",
      "titre": "L’expiration longue entre deux coups",
      "categorie": "respiration",
      "duree": 2,
      "lieu": "Sur le parcours",
      "objectif": "Avoir un outil de 30 secondes, discret, pour calmer ton système nerveux en marchant vers ta balle.",
      "etapes": [
        "Inspire 4 secondes par le nez.",
        "Expire 8 secondes, lentement, en relâchant les épaules et les mains.",
        "Entraîne-toi ici 2 minutes pour que le geste devienne automatique.",
        "Sur le parcours : 3 cycles suffisent, en marchant vers ta balle après un coup raté."
      ],
      "conseil": "C’est l’expiration qui calme. Si tu n’as qu’une chose à retenir sous pression : souffle plus long que tu n’inspires.",
      "minuteur": {
        "type": "respiration",
        "cycles": 10,
        "phases": [
          {
            "label": "Inspire",
            "secondes": 4,
            "action": "in"
          },
          {
            "label": "Expire",
            "secondes": 8,
            "action": "out"
          }
        ]
      }
    },
    {
      "id": "routine-3-temps",
      "titre": "Construis ta routine en 3 temps",
      "categorie": "routine",
      "duree": 10,
      "lieu": "À la maison",
      "objectif": "Poser par écrit une routine pré-coup simple et répétable : ton refuge quand la pression monte.",
      "etapes": [
        "Temps 1 – Réfléchir (derrière la balle) : lie, vent, distance, cible, club. Décide, puis ne reviens plus dessus.",
        "Temps 2 – Ressentir : un swing d’essai qui reproduit la sensation du coup voulu (pas un geste technique).",
        "Temps 3 – Jouer : tu t’installes, un regard vers la cible, tu frappes dans un délai régulier.",
        "Écris ta routine en 3 lignes maximum, avec tes propres mots.",
        "Répète-la à vide 10 fois dans ton salon, sans balle, en gardant le même rythme."
      ],
      "conseil": "Une bonne routine est courte et toujours identique. Ce n’est pas le moment de penser technique.",
      "minuteur": null
    },
    {
      "id": "routine-chrono",
      "titre": "Chronomètre ta routine",
      "categorie": "routine",
      "duree": 15,
      "lieu": "Au practice",
      "objectif": "Rendre ta routine régulière dans le temps : sous pression, on accélère ou on traîne sans s’en rendre compte.",
      "etapes": [
        "Demande à un partenaire de te chronométrer, ou filme-toi avec ton téléphone.",
        "Joue 10 balles avec ta routine complète, du moment où tu te places derrière la balle jusqu’à l’impact.",
        "Note le temps de chaque routine.",
        "Calcule ton temps moyen, puis rejoue 10 balles en visant ce temps à ± 2 secondes.",
        "Garde ce chiffre en tête : c’est ton tempo de référence pour le parcours."
      ],
      "conseil": "Sur le parcours, si une routine dure nettement plus longtemps que d’habitude, c’est souvent le signe que le doute s’est installé : recule et recommence.",
      "minuteur": null
    },
    {
      "id": "routine-ligne-decision",
      "titre": "La ligne de décision",
      "categorie": "routine",
      "duree": 10,
      "lieu": "Au practice",
      "objectif": "Séparer clairement le moment où tu réfléchis du moment où tu joues, pour frapper en étant engagé à 100 %.",
      "etapes": [
        "Pose un club au sol un pas derrière ta balle : c’est ta ligne de décision.",
        "Derrière la ligne, tu analyses et tu choisis ton coup.",
        "Quand tu franchis la ligne, tu n’as plus le droit de douter : tu joues.",
        "Si un doute arrive après la ligne, recule, refranchis la ligne et recommence la routine.",
        "Joue 15 balles en appliquant la règle sans exception."
      ],
      "conseil": "Reculer n’est pas une faiblesse, c’est la marque des joueurs solides.",
      "minuteur": null
    },
    {
      "id": "pression-practice-consequence",
      "titre": "Le practice à conséquence",
      "categorie": "pression",
      "duree": 20,
      "lieu": "Au practice",
      "objectif": "Recréer la pression du parcours à l’entraînement : chaque balle compte, il n’y a pas de deuxième essai.",
      "etapes": [
        "Choisis 3 cibles à des distances différentes et définis une zone de réussite pour chacune.",
        "Joue 9 balles en changeant de club et de cible à chaque fois, avec ta routine complète.",
        "Compte tes réussites sur 9.",
        "Fixe un objectif (par exemple 6/9). Si tu ne l’atteins pas, ajoute une conséquence : 10 putts de 1 m à rentrer d’affilée.",
        "Note ton score pour suivre ta progression d’une semaine à l’autre."
      ],
      "conseil": "Le but n’est pas de bien taper, c’est d’apprendre à jouer libéré même quand le résultat compte.",
      "minuteur": null
    },
    {
      "id": "pression-dernier-putt",
      "titre": "Le dernier putt",
      "categorie": "pression",
      "duree": 15,
      "lieu": "Au putting green",
      "objectif": "T’habituer à rentrer le putt qui compte, avec le cœur qui bat.",
      "etapes": [
        "Place 5 balles en ligne à 1 m, 1,5 m, 2 m, 2,5 m et 3 m du trou.",
        "Joue-les dans l’ordre avec ta routine complète.",
        "Une balle ratée : tu recommences tout depuis 1 m.",
        "Avant chaque putt, dis-toi une phrase de contexte : « Ce putt pour gagner le tournoi ».",
        "Arrête quand tu as réussi la série complète, ou après 15 minutes."
      ],
      "conseil": "Plus la série avance, plus la pression monte : c’est exactement la sensation que tu veux apprivoiser.",
      "minuteur": null
    },
    {
      "id": "pression-reinterpreter",
      "titre": "Transforme le stress en énergie",
      "categorie": "pression",
      "duree": 5,
      "lieu": "Partout",
      "objectif": "Changer ta lecture des signes de stress : ton corps ne te sabote pas, il se prépare à performer.",
      "etapes": [
        "Repense à la dernière fois où tu as senti la pression monter sur le parcours.",
        "Liste les sensations : cœur qui accélère, mains moites, souffle court…",
        "Pour chacune, écris la version « énergie » : « Mon cœur accélère pour envoyer plus d’énergie à mes muscles ».",
        "Choisis une phrase courte à te dire la prochaine fois : « Je suis prêt, mon corps s’active ».",
        "Termine par 3 expirations longues."
      ],
      "conseil": "Chercher à ne rien ressentir est impossible. Accepter la tension et lui donner un sens, c’est possible tout de suite.",
      "minuteur": null
    },
    {
      "id": "visu-coup-ideal",
      "titre": "Le film du coup idéal",
      "categorie": "visualisation",
      "duree": 5,
      "lieu": "À la maison",
      "objectif": "Graver dans ta tête l’image et la sensation de ton meilleur coup, pour la rappeler avant de jouer.",
      "etapes": [
        "Ferme les yeux et fais 3 respirations lentes.",
        "Choisis un coup précis : ton fer 7 sur un par 3 que tu connais, par exemple.",
        "Vois la scène en couleur : le paysage, le drapeau, le vent dans les arbres.",
        "Ressens ton grip, ton tempo, le contact franc de la balle.",
        "Suis la trajectoire jusqu’à ce que la balle s’arrête près du drapeau. Rejoue le film 5 fois."
      ],
      "conseil": "Plus tu ajoutes de sens (bruit de l’impact, odeur de l’herbe), plus la visualisation est efficace.",
      "minuteur": {
        "type": "simple",
        "secondes": 300
      }
    },
    {
      "id": "visu-reconnaissance-mentale",
      "titre": "Reconnaissance mentale du parcours",
      "categorie": "visualisation",
      "duree": 10,
      "lieu": "À la maison",
      "objectif": "Jouer ton prochain parcours dans ta tête la veille, pour arriver sur le tee en terrain connu.",
      "etapes": [
        "Prends la carte de score ou le plan du parcours de ton prochain tournoi.",
        "Pour chaque trou, visualise ton coup de départ : club choisi, cible, trajectoire.",
        "Vois ensuite ton deuxième coup et la zone du green où tu veux arriver.",
        "Sur les trous difficiles, imagine-toi calme et décidé, en train de jouer ta stratégie.",
        "Si tu manques de temps, concentre-toi sur les 3 premiers trous et les 3 derniers."
      ],
      "conseil": "Le but n’est pas d’imaginer 18 birdies, mais de te voir jouer tes choix avec engagement.",
      "minuteur": {
        "type": "simple",
        "secondes": 600
      }
    },
    {
      "id": "visu-situation-redoutee",
      "titre": "Visualise la situation qui te fait peur",
      "categorie": "visualisation",
      "duree": 6,
      "lieu": "À la maison",
      "objectif": "Désamorcer une situation qui te fait craquer en la vivant d’abord dans ta tête, avec la bonne réponse.",
      "etapes": [
        "Identifie LA situation qui te fait perdre tes moyens (premier départ devant du monde, putt de 1 m pour le par…).",
        "Ferme les yeux et installe la scène avec le plus de détails possible, y compris la tension que tu ressens.",
        "Vois-toi faire une expiration longue, puis dérouler ta routine comme d’habitude.",
        "Joue le coup dans ta tête et vois-le réussir.",
        "Recommence 3 fois, en sentant la tension baisser un peu à chaque passage."
      ],
      "conseil": "Si la scène devient trop inconfortable, ouvre les yeux, respire, puis reprends. Pas besoin de forcer.",
      "minuteur": {
        "type": "simple",
        "secondes": 360
      }
    },
    {
      "id": "conc-large-etroit",
      "titre": "Du large à l’étroit",
      "categorie": "concentration",
      "duree": 5,
      "lieu": "Au practice",
      "objectif": "Apprendre à resserrer ton attention au bon moment : large pour analyser, étroite pour jouer.",
      "etapes": [
        "Regarde l’ensemble du practice : drapeaux, arbres, filets. C’est ton attention large.",
        "Choisis une zone, puis un drapeau, puis un détail précis (un pied du drapeau, une tache sur un panneau).",
        "Garde ce détail en tête au moment de t’installer.",
        "Joue la balle en visant uniquement ce point.",
        "Répète sur 10 balles, avec une cible différente à chaque fois."
      ],
      "conseil": "« Viser petit, rater petit » : une cible floue donne un coup flou.",
      "minuteur": null
    },
    {
      "id": "conc-ancrage-sens",
      "titre": "Ancrage 5-4-3-2-1",
      "categorie": "concentration",
      "duree": 3,
      "lieu": "Partout",
      "objectif": "Revenir dans le moment présent quand ta tête part sur le score ou sur le coup raté d’avant.",
      "etapes": [
        "Nomme dans ta tête 5 choses que tu vois.",
        "4 choses que tu entends.",
        "3 choses que tu sens physiquement (tes pieds dans les chaussures, le grip du club…).",
        "2 odeurs.",
        "1 respiration longue. Tu es de retour ici et maintenant."
      ],
      "conseil": "Sur le parcours, une version courte (3-2-1) suffit en marchant vers ta balle.",
      "minuteur": {
        "type": "simple",
        "secondes": 180
      }
    },
    {
      "id": "conc-reset",
      "titre": "Le reset en 10 pas",
      "categorie": "concentration",
      "duree": 10,
      "lieu": "Sur le parcours",
      "objectif": "Ne pas emporter un mauvais coup sur le suivant : tu as 10 pas pour réagir, puis tu passes à autre chose.",
      "etapes": [
        "Après chaque coup, tu as droit à 10 pas pour vivre ton émotion (déception ou joie).",
        "Au 10e pas, fais un geste de reset : fermer le scratch du gant, toucher ta casquette…",
        "Fais une expiration longue et regarde un point au loin (un arbre, le ciel).",
        "Parle d’autre chose ou observe le paysage jusqu’à ta balle.",
        "Applique-le sur 9 trous et note combien de fois tu as réussi le reset."
      ],
      "conseil": "Le geste de reset doit toujours être le même : il devient un interrupteur pour ton cerveau.",
      "minuteur": null
    },
    {
      "id": "conf-carnet-reussites",
      "titre": "Le carnet des réussites",
      "categorie": "confiance",
      "duree": 5,
      "lieu": "À la maison",
      "objectif": "Nourrir ta confiance avec des preuves concrètes, au lieu de ne retenir que les erreurs.",
      "etapes": [
        "Écris 3 coups réussis de ta dernière partie ou de ton dernier entraînement.",
        "Pour chacun, note ce que tu as bien fait (décision, routine, engagement).",
        "Ajoute une sensation dont tu te souviens (le contact, le bruit, ta respiration).",
        "Relis tout ton carnet la veille d’un tournoi.",
        "Utilise la note ci-dessous pour garder une trace dans l’appli."
      ],
      "conseil": "Ton cerveau retient naturellement le négatif. Ce carnet rééquilibre la balance.",
      "minuteur": null
    },
    {
      "id": "conf-coach-interieur",
      "titre": "Ton coach intérieur",
      "categorie": "confiance",
      "duree": 10,
      "lieu": "À la maison",
      "objectif": "Remplacer les phrases qui te démolissent par des phrases qu’un bon coach te dirait.",
      "etapes": [
        "Liste les 3 phrases que tu te dis le plus souvent après un mauvais coup (« Nul », « Comme d’hab »…).",
        "Pour chacune, demande-toi : est-ce que je dirais ça à un élève ou à un ami ?",
        "Réécris-la comme le ferait un coach bienveillant mais exigeant : « Mauvaise décision, prochain coup : cible plus large. »",
        "Garde les nouvelles phrases sur ton téléphone ou dans ton sac.",
        "Sur ta prochaine partie, remplace chaque phrase négative par sa nouvelle version."
      ],
      "conseil": "Le but n’est pas de te mentir (« c’était un super coup ») mais d’être juste et tourné vers la suite.",
      "minuteur": null
    },
    {
      "id": "conf-mot-cle",
      "titre": "Ton mot-clé de confiance",
      "categorie": "confiance",
      "duree": 5,
      "lieu": "Partout",
      "objectif": "Avoir un mot unique qui te remet instantanément dans ton meilleur état de jeu.",
      "etapes": [
        "Repense à un moment où tu as très bien joué. Qu’est-ce que tu ressentais ?",
        "Résume cette sensation en un seul mot : « Fluide », « Libre », « Tranquille », « Attaque »…",
        "Associe-le à un geste simple (toucher ton gant, presser le grip).",
        "Ferme les yeux, revis le moment, dis le mot et fais le geste. Répète 5 fois.",
        "Utilise ce mot juste avant d’entrer dans ta routine sur les coups importants."
      ],
      "conseil": "Garde le même mot plusieurs semaines : c’est la répétition qui crée l’ancrage.",
      "minuteur": null
    },
    {
      "id": "ana-bilan-3-1",
      "titre": "Bilan 3 positifs, 1 axe",
      "categorie": "analyse",
      "duree": 10,
      "lieu": "Après la partie",
      "objectif": "Tirer le meilleur de chaque partie sans ruminer : retenir ce qui marche et choisir un seul axe de progrès.",
      "etapes": [
        "Dans l’heure qui suit la partie, isole-toi 10 minutes.",
        "Écris 3 choses positives, dont au moins une sur ton mental (routine tenue, bonne réaction…).",
        "Écris 1 seul axe de progrès, formulé en action : « Rester sur ma routine sur les putts de moins de 2 m ».",
        "Ferme ton carnet : la partie est terminée, tu n’y penses plus ce soir.",
        "Garde la trace dans la note ci-dessous."
      ],
      "conseil": "Un seul axe, pas cinq. On progresse plus en travaillant une chose à fond.",
      "minuteur": null
    },
    {
      "id": "ana-stats-mentales",
      "titre": "Les stats mentales de ta partie",
      "categorie": "analyse",
      "duree": 10,
      "lieu": "Après la partie",
      "objectif": "Mesurer ton mental comme tu mesures tes fairways et tes putts, pour voir tes vrais progrès.",
      "etapes": [
        "Reprends ta carte et, pour chaque trou, coche si ta routine a été respectée sur tous les coups.",
        "Note les trous où tu as réussi ton reset après un mauvais coup.",
        "Repère les trous où tu as été vraiment engagé sur chaque coup.",
        "Calcule un score sur 18 pour chacun des 3 critères.",
        "Compare avec ta partie précédente : c’est ce score que tu cherches à faire monter."
      ],
      "conseil": "Tu peux avoir un mauvais score et une excellente partie mentale. C’est elle qui prépare les bons scores.",
      "minuteur": null
    },
    {
      "id": "ana-coup-bascule",
      "titre": "Rejoue le coup qui a tout fait basculer",
      "categorie": "analyse",
      "duree": 7,
      "lieu": "Après la partie",
      "objectif": "Comprendre ce qui s’est passé dans ta tête au moment clé, sans te juger, pour mieux réagir la prochaine fois.",
      "etapes": [
        "Identifie le coup ou le trou où ta partie a changé de direction.",
        "Décris les faits : situation, club, décision, résultat.",
        "Décris ce que tu pensais et ressentais juste avant (score, peur, précipitation…).",
        "Écris ce que tu aurais pu faire à la place (respirer, choisir une cible plus sûre, reculer).",
        "Ferme les yeux et rejoue mentalement le coup avec cette nouvelle réponse."
      ],
      "conseil": "On ne refait pas le coup, on prépare le prochain. Sois curieux, pas sévère.",
      "minuteur": null
    }
  ],
  "routinesPression": [
    {
      "id": "coup-pression",
      "titre": "Coup sous pression",
      "sousTitre": "Moins d’une minute, juste avant de jouer",
      "etapes": [
        {
          "titre": "Reconnais",
          "texte": "Tu sens la pression. C’est normal : ton corps se prépare. Dis-toi « Je suis prêt ».",
          "secondes": 8
        },
        {
          "titre": "Respire",
          "texte": "Inspire 4 secondes, expire 8 secondes. Deux fois.",
          "secondes": 24,
          "respiration": [
            {
              "label": "Inspire",
              "secondes": 4,
              "action": "in"
            },
            {
              "label": "Expire",
              "secondes": 8,
              "action": "out"
            }
          ]
        },
        {
          "titre": "Choisis une cible précise",
          "texte": "Pas le green, pas le fairway : un point minuscule. Une branche, un pied de drapeau.",
          "secondes": 10
        },
        {
          "titre": "Engage-toi",
          "texte": "Dis ton mot-clé, franchis ta ligne de décision et joue ta routine habituelle.",
          "secondes": 8
        }
      ]
    },
    {
      "id": "avant-tournoi",
      "titre": "Avant le départ",
      "sousTitre": "3 minutes, avant le premier tee",
      "etapes": [
        {
          "titre": "Pose-toi",
          "texte": "Trouve un endroit un peu à l’écart. Pieds ancrés, épaules relâchées, regard au loin.",
          "secondes": 15
        },
        {
          "titre": "Cohérence cardiaque",
          "texte": "Inspire 5 secondes, expire 5 secondes. Suis le rythme.",
          "secondes": 60,
          "respiration": [
            {
              "label": "Inspire",
              "secondes": 5,
              "action": "in"
            },
            {
              "label": "Expire",
              "secondes": 5,
              "action": "out"
            }
          ]
        },
        {
          "titre": "Ancrage",
          "texte": "Nomme 3 choses que tu vois, 2 que tu entends, 1 que tu sens dans ton corps.",
          "secondes": 20
        },
        {
          "titre": "Ton plan de jeu",
          "texte": "Visualise ton coup de départ au 1 : club, cible, trajectoire. Puis le 2e coup.",
          "secondes": 30
        },
        {
          "titre": "Ton objectif du jour",
          "texte": "Un objectif de process, pas de score : « Routine complète sur chaque coup ».",
          "secondes": 20
        },
        {
          "titre": "Ton mot-clé",
          "texte": "Dis ton mot-clé, fais ton geste d’ancrage. Tu es prêt à jouer libéré.",
          "secondes": 15
        },
        {
          "titre": "Dernière respiration",
          "texte": "Une grande inspiration, une très longue expiration. Direction le tee.",
          "secondes": 15
        }
      ]
    }
  ]
};
