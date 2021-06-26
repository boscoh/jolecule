define(function () {
  return {
    'Mutational sensitivity (SNAP2 ratio of effect mutations)': {
      Source: 'SNAP2',
      URL: 'http://rostlab.org/services/snap2web/',
      Description:
        'Prediction of sequence positions to be sensitive / insensitive to mutation: The mutational sensitivity scores were calculated using the SNAP2 prediction method. Red values indicate residue positions that are highly sensitive, i.e., most of the 20 possible single amino acid polymorphisms will with high probablity cause loss of function. Blue values indicate residue positions that are highly insensitive, i.e., most of the 20 possible single amino acid polymorphisms will with high probability not effect function. Scores close to zero (white) indicate residue positions with normal sensitivity, i.e., some mutations will affect function, others will not.',
      Features: [
        {
          Name: 'Highly insensitive',
          Residue: '4',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '5',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '6',
          Color: '#3D3DFF',
          Description:
            '17/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '8',
          Color: '#8F8FFF',
          Description:
            '13/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '9',
          Color: '#3D3DFF',
          Description:
            '17/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '10',
          Color: '#3D3DFF',
          Description:
            '17/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '18',
          Color: '#FF6666',
          Description:
            '15/20 amino acid substitutions change function ; function changing are:  P : 69 , R : 65 , K : 62 , D : 60 , F : 59 , Y : 57 , W : 56 , L : 55 , I : 52 , G : 52 , H : 51 , E : 51 , N : 50 , C : 45 , Q : 45 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '19',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 90 , K : 89 , R : 87 , D : 86 , H : 85 , G : 84 , E : 82 , N : 82 , Q : 82 , T : 80 , S : 77 , V : 75 , M : 74 , I : 71 , Y : 71 , W : 69 , A : 68 , L : 57 , C : 51 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '20',
          Color: '#A3A3FF',
          Description:
            '12/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '21',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  P : 74 , R : 68 , W : 66 , M : 57 , G : 56 , L : 53 , H : 53 , F : 53 , N : 50 , I : 50 , V : 50 , S : 49 , T : 49 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '22',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  K : 66 , D : 66 , N : 65 , E : 63 , R : 62 , G : 60 , P : 60 , S : 58 , Q : 58 , W : 55 , T : 55 , Y : 51 , H : 48 , A : 44 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '23',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  P : 84 , R : 79 , K : 78 , H : 77 , N : 74 , D : 74 , Q : 73 , E : 71 , L : 70 , T : 69 , S : 68 , I : 67 , A : 63 , V : 60 , G : 58 , C : 56 , M : 55 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '28',
          Color: '#7A7AFF',
          Description:
            '14/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '29',
          Color: '#7A7AFF',
          Description:
            '14/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '33',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '34',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '38',
          Color: '#3D3DFF',
          Description:
            '17/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '46',
          Color: '#A3A3FF',
          Description:
            '12/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '55',
          Color: '#B8B8FF',
          Description:
            '11/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '63',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '69',
          Color: '#1414FF',
          Description:
            '19/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '70',
          Color: '#0000FF',
          Description:
            '20/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '71',
          Color: '#8F8FFF',
          Description:
            '13/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '74',
          Color: '#3D3DFF',
          Description:
            '17/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '75',
          Color: '#B8B8FF',
          Description:
            '11/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '76',
          Color: '#2828FF',
          Description:
            '18/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '78',
          Color: '#2828FF',
          Description:
            '18/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '79',
          Color: '#2828FF',
          Description:
            '18/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '81',
          Color: '#5151FF',
          Description:
            '16/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '87',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '88',
          Color: '#1414FF',
          Description:
            '19/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '89',
          Color: '#A3A3FF',
          Description:
            '12/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '90',
          Color: '#5151FF',
          Description:
            '16/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '100',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '103',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  K : 87 , E : 85 , D : 85 , P : 84 , R : 83 , N : 83 , G : 83 , T : 82 , Q : 79 , S : 79 , M : 76 , L : 73 , A : 72 , W : 70 , I : 70 , V : 67 , C : 67 , F : 50 , H : 46 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '105',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  W : 80 , K : 80 , E : 78 , Y : 77 , L : 73 , D : 73 , R : 72 , I : 72 , P : 72 , V : 70 , Q : 69 , F : 67 , H : 67 , T : 61 , C : 61 , A : 59 , N : 59 , M : 55 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '106',
          Color: '#5151FF',
          Description:
            '16/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '107',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  P : 88 , K : 88 , R : 83 , E : 83 , Q : 82 , D : 82 , N : 77 , G : 76 , M : 75 , T : 75 , I : 65 , A : 62 , W : 56 , S : 55 , V : 54 , L : 50 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '108',
          Color: '#FFB8B8',
          Description:
            '11/20 amino acid substitutions change function ; function changing are:  K : 77 , P : 75 , W : 75 , Y : 73 , E : 66 , M : 61 , I : 60 , L : 58 , F : 58 , V : 53 , T : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '109',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  K : 88 , R : 86 , P : 86 , E : 85 , D : 85 , H : 83 , Q : 82 , T : 80 , G : 80 , W : 79 , N : 79 , S : 75 , Y : 71 , A : 69 , I : 67 , M : 60 , C : 60 , V : 60 , L : 45 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '111',
          Color: '#FF6666',
          Description:
            '15/20 amino acid substitutions change function ; function changing are:  D : 80 , E : 77 , P : 76 , R : 76 , K : 75 , N : 74 , H : 73 , Q : 70 , G : 70 , W : 70 , S : 63 , Y : 63 , A : 51 , T : 48 , F : 42 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '112',
          Color: '#3D3DFF',
          Description:
            '17/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '113',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  K : 77 , E : 75 , R : 75 , P : 73 , D : 73 , H : 68 , G : 68 , N : 66 , Q : 62 , W : 60 , T : 58 , A : 57 , S : 53 , C : 49 , V : 48 , L : 45 , Y : 44 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '119',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  D : 60 , E : 60 , K : 58 , W : 58 , Q : 51 , P : 49 , H : 46 , N : 46 , I : 46 , Y : 44 , L : 43 , V : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '120',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  D : 85 , N : 77 , P : 75 , E : 74 , W : 72 , G : 71 , T : 69 , F : 68 , S : 66 , L : 65 , I : 63 , Q : 61 , V : 61 , M : 57 , Y : 56 , H : 54 , C : 54 , R : 52 , A : 52 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '122',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  D : 73 , G : 67 , E : 64 , R : 64 , W : 64 , K : 63 , H : 60 , Q : 57 , N : 54 , P : 54 , S : 44 , M : 42 , F : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '124',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  P : 82 , E : 80 , Q : 79 , R : 78 , D : 76 , K : 76 , I : 75 , M : 69 , G : 68 , H : 68 , T : 64 , L : 58 , N : 57 , W : 57 , V : 54 , A : 48 , F : 46 , Y : 43 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '125',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  V : 93 , P : 80 , D : 75 , E : 71 , G : 71 , R : 69 , W : 69 , N : 68 , K : 68 , H : 63 , Q : 63 , L : 57 , Y : 55 , C : 51 , M : 50 , I : 48 , F : 48 , A : 46 , S : 41 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '126',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 93 , K : 92 , R : 91 , E : 89 , T : 88 , G : 88 , N : 88 , D : 87 , H : 87 , Q : 86 , S : 86 , M : 86 , L : 82 , A : 79 , I : 79 , C : 77 , V : 74 , W : 69 , F : 41 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '127',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 89 , D : 84 , L : 83 , F : 79 , I : 79 , G : 79 , E : 78 , V : 77 , W : 75 , K : 75 , H : 75 , M : 74 , Y : 73 , Q : 71 , R : 68 , N : 68 , A : 67 , C : 65 , T : 59 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '128',
          Color: '#2828FF',
          Description:
            '18/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '129',
          Color: '#2828FF',
          Description:
            '18/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '130',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  D : 83 , R : 79 , P : 79 , G : 78 , E : 76 , N : 76 , K : 76 , T : 71 , H : 68 , S : 66 , Q : 66 , W : 66 , A : 61 , F : 60 , Y : 60 , M : 48 , V : 41 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '132',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  D : 89 , P : 88 , E : 87 , W : 85 , G : 82 , Y : 79 , N : 78 , H : 76 , I : 76 , V : 75 , F : 75 , L : 74 , S : 69 , A : 69 , R : 67 , C : 67 , Q : 66 , T : 65 , M : 53 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '134',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  D : 90 , P : 90 , R : 87 , K : 86 , E : 86 , G : 85 , H : 84 , T : 83 , N : 83 , Q : 83 , S : 83 , L : 80 , W : 77 , V : 75 , A : 73 , I : 73 , M : 70 , C : 67 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '135',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  I : 89 , P : 73 , D : 70 , W : 68 , E : 66 , G : 65 , R : 63 , Y : 62 , Q : 60 , H : 59 , N : 59 , F : 58 , K : 55 , M : 46 , S : 45 , L : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '136',
          Color: '#FFB8B8',
          Description:
            '11/20 amino acid substitutions change function ; function changing are:  P : 61 , W : 59 , F : 53 , G : 52 , E : 52 , T : 48 , L : 47 , D : 47 , I : 44 , H : 42 , M : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '137',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  D : 77 , E : 72 , K : 70 , R : 68 , N : 68 , G : 62 , H : 62 , Q : 60 , S : 59 , P : 52 , A : 51 , Y : 41 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '138',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  P : 75 , W : 64 , Y : 59 , F : 58 , D : 53 , L : 53 , K : 50 , E : 49 , R : 48 , H : 46 , T : 42 , G : 41 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '139',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  D : 84 , P : 78 , W : 75 , E : 71 , F : 69 , G : 69 , N : 64 , I : 60 , Q : 58 , Y : 57 , L : 56 , S : 55 , R : 53 , T : 49 , A : 44 , C : 42 , V : 41 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '141',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  P : 69 , D : 69 , E : 65 , R : 64 , G : 63 , W : 61 , K : 60 , N : 58 , Y : 56 , Q : 54 , M : 50 , H : 48 , L : 48 , I : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '142',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  D : 80 , K : 77 , E : 76 , G : 73 , W : 72 , R : 70 , Y : 69 , N : 68 , F : 66 , H : 64 , V : 62 , I : 60 , Q : 57 , C : 56 , S : 55 , M : 54 , T : 51 , A : 47 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '143',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  D : 66 , K : 63 , E : 62 , G : 58 , H : 57 , N : 56 , P : 54 , Q : 52 , W : 48 , S : 48 , Y : 46 , R : 43 , T : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '145',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  D : 66 , K : 64 , E : 62 , R : 60 , N : 57 , P : 57 , G : 56 , H : 53 , Q : 51 , S : 50 , W : 46 , T : 44 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '147',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  D : 74 , E : 71 , R : 70 , K : 69 , H : 68 , N : 67 , P : 67 , G : 58 , Q : 56 , S : 55 , Y : 51 , A : 47 , F : 44 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '149',
          Color: '#7A7AFF',
          Description:
            '14/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '150',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '151',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  D : 76 , G : 70 , E : 69 , R : 67 , W : 63 , K : 59 , Y : 59 , N : 52 , H : 51 , T : 51 , C : 47 , F : 47 , S : 44 , Q : 42 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '153',
          Color: '#8F8FFF',
          Description:
            '13/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '154',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  K : 63 , E : 63 , W : 60 , D : 56 , H : 53 , R : 52 , F : 50 , I : 48 , P : 48 , T : 46 , V : 45 , Q : 45 , M : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '157',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  K : 85 , D : 85 , W : 84 , R : 84 , E : 82 , Q : 81 , G : 80 , N : 80 , Y : 79 , H : 78 , P : 76 , S : 75 , F : 73 , T : 71 , M : 64 , A : 59 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '158',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  D : 95 , W : 94 , P : 93 , E : 93 , F : 92 , Y : 92 , L : 92 , N : 92 , G : 92 , S : 90 , I : 90 , M : 89 , T : 88 , K : 87 , V : 87 , A : 86 , Q : 84 , C : 72 , H : 51 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '159',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  P : 88 , D : 87 , W : 87 , E : 86 , K : 86 , H : 85 , Y : 85 , R : 84 , F : 84 , L : 81 , N : 81 , Q : 75 , I : 70 , C : 64 , V : 64 , M : 62 , S : 60 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '160',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  E : 84 , K : 84 , D : 82 , N : 81 , W : 81 , G : 80 , R : 80 , P : 79 , S : 72 , H : 68 , Q : 64 , Y : 61 , C : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '161',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  W : 72 , D : 71 , E : 71 , K : 68 , F : 67 , Y : 66 , R : 63 , H : 60 , Q : 57 , N : 57 , I : 54 , G : 43 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '162',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  D : 73 , P : 67 , N : 64 , K : 64 , H : 61 , E : 60 , G : 59 , W : 59 , R : 55 , Q : 53 , S : 52 , Y : 51 , T : 47 , F : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '163',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 97 , K : 96 , R : 95 , T : 94 , D : 94 , N : 94 , E : 93 , G : 93 , M : 92 , S : 92 , Q : 92 , L : 91 , H : 91 , W : 90 , I : 88 , V : 86 , A : 85 , C : 71 , F : 48 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '168',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  E : 72 , P : 72 , R : 71 , G : 68 , K : 68 , T : 63 , D : 60 , A : 55 , I : 54 , N : 54 , V : 53 , L : 52 , S : 52 , M : 50 , C : 50 , Q : 46 , W : 45 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '169',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  D : 73 , P : 72 , K : 72 , E : 71 , H : 64 , G : 60 , S : 60 , W : 60 , N : 58 , R : 46 , Q : 43 , A : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '172',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  D : 73 , K : 70 , E : 69 , H : 65 , W : 64 , R : 63 , G : 60 , Q : 60 , Y : 58 , N : 50 , T : 49 , S : 48 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '173',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  P : 88 , D : 86 , K : 85 , R : 85 , W : 84 , G : 84 , N : 83 , E : 83 , Q : 81 , Y : 80 , S : 78 , F : 76 , L : 76 , T : 73 , H : 71 , A : 63 , M : 63 , C : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '174',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  D : 85 , P : 77 , G : 70 , W : 70 , F : 64 , E : 62 , Y : 59 , N : 57 , I : 53 , V : 51 , M : 47 , L : 46 , S : 43 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '175',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  H : 94 , D : 93 , P : 91 , W : 89 , G : 88 , N : 86 , E : 85 , F : 85 , L : 84 , S : 84 , Y : 84 , I : 83 , T : 81 , V : 79 , M : 79 , Q : 78 , K : 77 , A : 74 , C : 60 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '176',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  D : 91 , E : 90 , R : 88 , P : 88 , Q : 88 , G : 88 , W : 88 , K : 88 , H : 87 , N : 87 , L : 86 , F : 86 , S : 82 , M : 81 , T : 81 , Y : 80 , V : 79 , I : 75 , A : 68 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '179',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  K : 85 , E : 82 , P : 82 , R : 80 , D : 77 , W : 77 , G : 75 , N : 72 , T : 72 , Q : 69 , I : 68 , V : 68 , F : 66 , A : 66 , M : 64 , S : 62 , Y : 60 , C : 47 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '182',
          Color: '#7A7AFF',
          Description:
            '14/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '183',
          Color: '#5151FF',
          Description:
            '16/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '187',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  R : 70 , W : 69 , Y : 62 , F : 62 , H : 62 , P : 59 , Q : 58 , L : 57 , M : 56 , I : 52 , V : 51 , K : 49 , E : 43 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '188',
          Color: '#8F8FFF',
          Description:
            '13/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '189',
          Color: '#A3A3FF',
          Description:
            '12/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '193',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 83 , K : 82 , D : 80 , E : 76 , R : 73 , G : 73 , T : 67 , Y : 67 , N : 67 , W : 65 , L : 65 , M : 64 , Q : 62 , C : 59 , A : 58 , I : 56 , S : 54 , V : 54 , F : 52 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '194',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  P : 76 , D : 76 , K : 73 , E : 72 , R : 71 , G : 71 , Q : 63 , W : 60 , N : 59 , S : 58 , T : 57 , A : 56 , Y : 50 , H : 48 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '196',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  D : 88 , P : 85 , E : 80 , W : 79 , G : 78 , N : 77 , F : 73 , Y : 71 , L : 71 , K : 69 , M : 66 , T : 63 , S : 60 , A : 59 , V : 56 , I : 52 , H : 49 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '199',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  W : 70 , Y : 64 , R : 62 , D : 60 , K : 59 , F : 58 , I : 55 , E : 52 , V : 52 , L : 46 , P : 46 , M : 43 , T : 41 , C : 41 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '201',
          Color: '#8F8FFF',
          Description:
            '13/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '205',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  R : 88 , K : 87 , P : 86 , D : 83 , E : 82 , S : 80 , N : 79 , G : 79 , W : 79 , T : 78 , L : 77 , Q : 77 , M : 73 , A : 72 , H : 71 , I : 69 , V : 69 , C : 65 , F : 61 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '208',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  P : 80 , R : 70 , K : 66 , W : 62 , I : 62 , Y : 61 , F : 59 , L : 58 , Q : 56 , S : 55 , V : 49 , E : 46 , T : 45 , G : 43 , H : 42 , M : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '213',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  D : 91 , P : 90 , E : 87 , G : 85 , W : 84 , N : 83 , F : 82 , L : 81 , T : 79 , I : 79 , Q : 78 , S : 78 , Y : 77 , K : 75 , V : 74 , A : 73 , C : 69 , M : 66 , H : 58 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '215',
          Color: '#FF6666',
          Description:
            '15/20 amino acid substitutions change function ; function changing are:  W : 68 , P : 67 , D : 61 , R : 60 , Y : 56 , I : 54 , K : 54 , Q : 53 , G : 52 , H : 52 , E : 51 , L : 49 , V : 48 , M : 48 , F : 44 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '216',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  D : 83 , W : 82 , K : 82 , E : 80 , P : 80 , N : 77 , Q : 76 , F : 73 , R : 71 , G : 71 , Y : 68 , M : 66 , H : 63 , T : 62 , S : 61 , L : 59 , A : 46 , C : 45 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '218',
          Color: '#FF6666',
          Description:
            '15/20 amino acid substitutions change function ; function changing are:  K : 80 , D : 80 , R : 77 , W : 75 , P : 74 , H : 73 , G : 72 , Q : 71 , E : 70 , N : 67 , S : 65 , M : 50 , Y : 46 , F : 43 , A : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '219',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  D : 83 , W : 77 , E : 74 , N : 74 , Y : 73 , F : 73 , R : 72 , G : 71 , K : 71 , V : 68 , I : 67 , Q : 66 , H : 66 , L : 64 , T : 63 , C : 62 , S : 59 , A : 50 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '220',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  K : 85 , P : 84 , R : 82 , E : 80 , D : 79 , G : 76 , N : 72 , S : 69 , T : 67 , W : 66 , Q : 66 , A : 64 , I : 60 , H : 57 , V : 55 , C : 55 , M : 51 , L : 51 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '222',
          Color: '#2828FF',
          Description:
            '18/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '226',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  K : 69 , R : 66 , D : 64 , Y : 61 , P : 61 , I : 60 , L : 59 , N : 57 , E : 55 , M : 50 , F : 47 , V : 47 , H : 45 , C : 44 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '230',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  P : 74 , D : 70 , K : 67 , W : 65 , R : 62 , E : 58 , L : 51 , G : 51 , Y : 50 , N : 48 , I : 48 , F : 47 , C : 45 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '231',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  R : 78 , D : 76 , P : 75 , E : 72 , W : 72 , Y : 70 , L : 69 , H : 68 , K : 68 , G : 67 , N : 64 , F : 64 , I : 58 , Q : 58 , M : 56 , V : 54 , C : 54 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '232',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  P : 78 , K : 77 , R : 75 , D : 73 , G : 72 , H : 69 , E : 68 , Q : 68 , N : 63 , T : 61 , S : 61 , A : 58 , W : 51 , Y : 45 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '234',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  P : 87 , K : 86 , R : 83 , N : 78 , Q : 78 , E : 78 , D : 77 , S : 75 , T : 74 , G : 73 , W : 72 , C : 64 , M : 64 , H : 63 , A : 59 , V : 51 , I : 47 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '235',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  P : 75 , W : 74 , D : 67 , L : 65 , I : 64 , Y : 64 , F : 63 , V : 61 , G : 55 , R : 51 , M : 51 , C : 42 , E : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '236',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  P : 93 , K : 91 , R : 90 , D : 88 , E : 88 , N : 87 , Q : 87 , T : 85 , G : 84 , S : 81 , M : 81 , H : 76 , A : 74 , V : 74 , W : 73 , I : 73 , C : 68 , L : 61 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '237',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 89 , K : 87 , D : 87 , E : 87 , N : 84 , R : 82 , G : 81 , S : 80 , Q : 80 , W : 74 , T : 71 , H : 69 , A : 61 , C : 60 , Y : 57 , F : 55 , I : 51 , L : 46 , V : 44 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '238',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 93 , K : 91 , R : 90 , D : 90 , W : 90 , N : 89 , E : 88 , H : 88 , Y : 87 , G : 86 , L : 86 , F : 86 , Q : 85 , I : 84 , M : 84 , T : 84 , S : 81 , V : 80 , A : 69 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '239',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  P : 80 , W : 77 , D : 70 , I : 68 , V : 68 , E : 66 , G : 66 , R : 65 , M : 63 , H : 62 , T : 57 , A : 54 , L : 54 , Y : 52 , K : 52 , F : 47 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '240',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 91 , W : 90 , F : 86 , Y : 86 , L : 86 , K : 85 , I : 85 , V : 85 , E : 84 , D : 84 , H : 82 , R : 80 , Q : 80 , M : 80 , G : 74 , N : 73 , A : 70 , T : 63 , C : 62 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '241',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  F : 99 , P : 91 , W : 88 , D : 86 , G : 86 , K : 85 , V : 85 , Y : 84 , L : 84 , E : 84 , I : 83 , Q : 82 , R : 82 , H : 81 , M : 80 , N : 77 , A : 73 , T : 67 , C : 55 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '242',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  K : 92 , W : 91 , H : 91 , G : 91 , E : 90 , R : 90 , P : 90 , D : 90 , Y : 89 , N : 88 , Q : 88 , L : 86 , T : 85 , F : 85 , S : 85 , I : 83 , M : 82 , V : 77 , A : 74 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '243',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  D : 81 , E : 80 , K : 79 , H : 75 , R : 74 , Q : 72 , P : 71 , N : 70 , W : 67 , T : 64 , G : 63 , S : 58 , A : 56 , F : 55 , Y : 49 , I : 45 , L : 44 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '244',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  D : 99 , K : 88 , W : 87 , P : 87 , R : 86 , Y : 85 , E : 85 , F : 83 , H : 82 , L : 82 , Q : 81 , V : 79 , I : 79 , M : 79 , N : 76 , T : 69 , A : 68 , S : 58 , C : 46 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '245',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  S : 92 , P : 90 , W : 89 , D : 88 , R : 88 , Y : 88 , K : 87 , E : 85 , H : 85 , F : 85 , N : 83 , I : 83 , L : 83 , V : 81 , T : 78 , Q : 76 , C : 72 , A : 70 , M : 67 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '246',
          Color: '#FF6666',
          Description:
            '15/20 amino acid substitutions change function ; function changing are:  K : 71 , D : 68 , E : 66 , H : 65 , N : 64 , R : 59 , T : 58 , Q : 58 , S : 56 , W : 53 , P : 53 , G : 48 , Y : 46 , A : 44 , F : 41 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '248',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  W : 95 , Q : 93 , D : 93 , P : 91 , G : 87 , N : 85 , F : 84 , E : 83 , S : 83 , Y : 83 , T : 82 , H : 81 , I : 80 , V : 79 , L : 78 , M : 76 , A : 73 , C : 71 , K : 68 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '249',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  S : 94 , D : 88 , P : 84 , G : 77 , N : 75 , F : 74 , Y : 72 , L : 70 , I : 68 , V : 66 , H : 63 , W : 62 , M : 62 , E : 60 , T : 56 , Q : 56 , C : 52 , A : 50 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '250',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  W : 59 , R : 57 , Y : 55 , G : 54 , F : 53 , E : 53 , D : 50 , N : 49 , I : 45 , H : 45 , K : 44 , L : 43 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '251',
          Color: '#FFB8B8',
          Description:
            '11/20 amino acid substitutions change function ; function changing are:  D : 70 , E : 67 , K : 65 , G : 63 , R : 62 , P : 61 , H : 59 , W : 57 , Q : 54 , Y : 49 , S : 48 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '252',
          Color: '#FFB8B8',
          Description:
            '11/20 amino acid substitutions change function ; function changing are:  P : 73 , D : 64 , W : 62 , G : 55 , K : 54 , Y : 51 , N : 50 , R : 50 , E : 48 , S : 44 , T : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '253',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  P : 80 , R : 78 , K : 78 , E : 75 , D : 75 , W : 74 , Y : 70 , Q : 69 , H : 66 , G : 65 , N : 64 , F : 56 , C : 50 , M : 49 , L : 49 , S : 45 , A : 45 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '254',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  D : 84 , K : 84 , R : 83 , G : 81 , E : 81 , H : 81 , W : 81 , N : 80 , P : 79 , Q : 76 , S : 74 , F : 68 , Y : 67 , T : 59 , M : 56 , A : 55 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '255',
          Color: '#FF6666',
          Description:
            '15/20 amino acid substitutions change function ; function changing are:  P : 77 , K : 74 , D : 73 , R : 71 , E : 70 , G : 69 , N : 68 , H : 67 , Q : 64 , W : 63 , T : 60 , S : 51 , A : 48 , Y : 43 , M : 41 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '256',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  K : 82 , P : 81 , D : 76 , W : 75 , R : 75 , Y : 73 , L : 71 , E : 70 , G : 69 , V : 68 , H : 68 , I : 64 , Q : 62 , F : 61 , A : 54 , N : 54 , M : 48 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '257',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  D : 89 , P : 88 , K : 87 , N : 85 , G : 85 , E : 85 , R : 85 , H : 83 , S : 80 , W : 79 , T : 76 , Y : 75 , F : 67 , Q : 67 , A : 59 , C : 52 , I : 48 , V : 47 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '258',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  P : 87 , K : 79 , G : 77 , W : 73 , S : 71 , R : 70 , D : 69 , L : 69 , H : 69 , F : 68 , T : 68 , N : 67 , V : 66 , Y : 66 , M : 60 , I : 56 , A : 49 , Q : 48 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '260',
          Color: '#B8B8FF',
          Description:
            '11/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '261',
          Color: '#5151FF',
          Description:
            '16/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '262',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  P : 82 , K : 81 , W : 76 , D : 75 , Y : 74 , R : 72 , H : 71 , I : 70 , L : 70 , F : 70 , V : 68 , E : 67 , M : 66 , T : 65 , N : 56 , S : 56 , A : 49 , Q : 46 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '265',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  D : 84 , K : 82 , E : 81 , G : 80 , N : 79 , H : 78 , R : 78 , P : 76 , Q : 74 , S : 73 , T : 70 , A : 63 , W : 62 , Y : 60 , F : 54 , C : 45 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '266',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  W : 85 , K : 85 , D : 84 , R : 83 , E : 82 , P : 82 , H : 81 , N : 80 , L : 79 , F : 79 , M : 78 , I : 78 , V : 76 , Q : 76 , T : 73 , Y : 73 , C : 63 , S : 56 , A : 54 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '267',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  D : 92 , P : 90 , E : 87 , G : 86 , N : 85 , L : 85 , F : 85 , Y : 85 , I : 82 , M : 81 , S : 79 , V : 78 , W : 78 , A : 71 , Q : 68 , T : 52 , K : 45 , C : 43 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '270',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  D : 77 , P : 75 , K : 74 , E : 73 , R : 71 , G : 69 , N : 68 , H : 68 , Q : 63 , S : 63 , W : 55 , A : 54 , T : 49 , Y : 48 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '271',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  R : 77 , K : 74 , P : 74 , W : 69 , T : 67 , G : 66 , I : 64 , F : 63 , V : 62 , S : 61 , L : 60 , H : 59 , M : 58 , N : 54 , Q : 53 , Y : 51 , D : 48 , A : 45 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '272',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  P : 87 , D : 85 , K : 84 , W : 84 , R : 83 , E : 82 , H : 80 , N : 80 , Q : 79 , Y : 79 , S : 74 , L : 72 , G : 70 , F : 63 , T : 58 , M : 52 , C : 45 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '273',
          Color: '#FF0000',
          Description:
            '20/20 amino acid substitutions change function ; function changing are:  Y : 99 , T : 99 , W : 99 , P : 99 , G : 99 , S : 99 , K : 98 , Q : 98 , I : 98 , C : 98 , L : 98 , H : 97 , M : 97 , D : 96 , R : 94 , E : 94 , N : 93 , V : 91 , F : 89 , A : 88 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '274',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  P : 89 , W : 88 , K : 86 , D : 85 , R : 84 , E : 82 , H : 82 , Y : 81 , Q : 81 , F : 80 , N : 80 , G : 80 , L : 79 , M : 76 , T : 66 , S : 63 , A : 59 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '275',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 96 , D : 95 , E : 94 , R : 94 , G : 94 , W : 94 , K : 94 , H : 93 , L : 93 , N : 93 , Q : 93 , F : 93 , Y : 93 , I : 92 , M : 91 , S : 90 , T : 90 , V : 89 , A : 75 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '276',
          Color: '#FF6666',
          Description:
            '15/20 amino acid substitutions change function ; function changing are:  D : 76 , W : 73 , E : 70 , F : 69 , Y : 68 , L : 63 , H : 62 , N : 60 , Q : 58 , G : 58 , I : 55 , V : 55 , K : 52 , M : 52 , R : 49 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '277',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 94 , D : 93 , E : 92 , W : 92 , R : 91 , K : 91 , H : 90 , Q : 90 , F : 90 , Y : 88 , I : 87 , M : 86 , T : 86 , L : 84 , V : 84 , S : 83 , N : 77 , A : 75 , G : 73 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '278',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  D : 77 , E : 73 , G : 70 , W : 70 , R : 69 , N : 63 , F : 62 , L : 61 , V : 60 , Q : 55 , T : 55 , K : 54 , C : 53 , H : 52 , I : 48 , M : 47 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '280',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  D : 91 , P : 89 , E : 88 , G : 86 , N : 84 , F : 83 , L : 83 , Y : 82 , T : 79 , H : 79 , S : 79 , I : 78 , V : 78 , M : 77 , Q : 77 , K : 76 , C : 73 , A : 69 , W : 67 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '281',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  R : 76 , K : 76 , W : 73 , L : 72 , I : 72 , Y : 71 , V : 70 , P : 69 , F : 68 , G : 67 , M : 66 , N : 63 , C : 57 , Q : 57 , A : 56 , S : 55 , T : 55 , H : 43 , E : 42 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '289',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '290',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  W : 80 , G : 72 , E : 70 , P : 68 , C : 67 , S : 62 , T : 58 , M : 57 , I : 50 , L : 50 , K : 49 , Q : 49 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '293',
          Color: '#1414FF',
          Description:
            '19/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '294',
          Color: '#B8B8FF',
          Description:
            '11/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '295',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '296',
          Color: '#1414FF',
          Description:
            '19/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '297',
          Color: '#5151FF',
          Description:
            '16/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '299',
          Color: '#5151FF',
          Description:
            '16/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '302',
          Color: '#8F8FFF',
          Description:
            '13/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '307',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '310',
          Color: '#7A7AFF',
          Description:
            '14/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '317',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '322',
          Color: '#5151FF',
          Description:
            '16/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '323',
          Color: '#1414FF',
          Description:
            '19/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '326',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  P : 89 , R : 83 , W : 82 , G : 82 , F : 76 , I : 76 , S : 75 , T : 74 , N : 74 , H : 74 , L : 74 , Q : 73 , M : 71 , V : 69 , Y : 64 , K : 63 , C : 62 , A : 59 , D : 50 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '328',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  P : 84 , D : 83 , K : 81 , R : 80 , E : 79 , G : 79 , N : 79 , T : 73 , H : 73 , Q : 73 , W : 70 , A : 66 , M : 64 , L : 64 , V : 59 , S : 54 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '330',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  P : 86 , D : 85 , K : 84 , R : 82 , E : 81 , G : 80 , N : 80 , H : 80 , S : 75 , Y : 75 , Q : 69 , T : 69 , W : 64 , A : 59 , C : 52 , F : 47 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '332',
          Color: '#FF2828',
          Description:
            '18/20 amino acid substitutions change function ; function changing are:  P : 84 , D : 83 , K : 82 , E : 81 , G : 80 , R : 80 , N : 79 , H : 76 , W : 76 , Q : 74 , S : 73 , Y : 71 , T : 66 , F : 65 , L : 61 , A : 58 , M : 57 , C : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '333',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  D : 90 , P : 84 , G : 83 , E : 82 , N : 81 , W : 77 , S : 74 , F : 71 , L : 71 , M : 65 , A : 63 , I : 57 , C : 56 , T : 41 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '334',
          Color: '#FF1414',
          Description:
            '19/20 amino acid substitutions change function ; function changing are:  W : 86 , P : 86 , Y : 85 , D : 85 , E : 85 , R : 84 , K : 82 , H : 82 , Q : 80 , L : 79 , F : 78 , M : 77 , I : 76 , V : 74 , T : 72 , N : 70 , S : 64 , A : 62 , C : 55 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '335',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  D : 90 , P : 86 , W : 84 , E : 82 , N : 81 , Y : 79 , G : 77 , V : 76 , I : 76 , L : 74 , M : 74 , F : 73 , S : 73 , T : 71 , A : 66 , C : 65 , Q : 59 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '337',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  D : 84 , P : 82 , W : 81 , F : 76 , G : 74 , Y : 74 , L : 72 , V : 68 , M : 66 , S : 61 , E : 61 , I : 60 , A : 60 , T : 48 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '338',
          Color: '#FF5151',
          Description:
            '16/20 amino acid substitutions change function ; function changing are:  K : 78 , P : 78 , D : 76 , R : 75 , E : 72 , N : 70 , G : 69 , Q : 66 , T : 65 , H : 65 , S : 64 , I : 55 , L : 55 , A : 54 , V : 54 , M : 49 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '341',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  D : 69 , K : 62 , E : 59 , N : 58 , P : 57 , G : 55 , H : 55 , W : 52 , R : 48 , Q : 48 , T : 46 , Y : 43 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '344',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  P : 79 , D : 79 , K : 74 , G : 74 , E : 72 , N : 72 , H : 72 , R : 66 , Q : 66 , W : 64 , T : 60 , S : 58 , A : 52 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '347',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  P : 68 , K : 62 , W : 61 , R : 60 , E : 57 , Y : 56 , D : 55 , H : 54 , F : 53 , Q : 47 , L : 46 , T : 43 , N : 41 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '348',
          Color: '#FF3D3D',
          Description:
            '17/20 amino acid substitutions change function ; function changing are:  P : 80 , G : 77 , D : 74 , H : 74 , E : 73 , K : 73 , R : 71 , S : 70 , N : 69 , T : 69 , W : 67 , Q : 62 , A : 61 , Y : 57 , C : 53 , V : 47 , I : 41 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '353',
          Color: '#2828FF',
          Description:
            '18/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '354',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '355',
          Color: '#5151FF',
          Description:
            '16/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '356',
          Color: '#2828FF',
          Description:
            '18/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '364',
          Color: '#2828FF',
          Description:
            '18/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '366',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '367',
          Color: '#1414FF',
          Description:
            '19/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '368',
          Color: '#5151FF',
          Description:
            '16/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '369',
          Color: '#7A7AFF',
          Description:
            '14/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '371',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '374',
          Color: '#7A7AFF',
          Description:
            '14/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '375',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '376',
          Color: '#A3A3FF',
          Description:
            '12/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly sensitive',
          Residue: '381',
          Color: '#FF7A7A',
          Description:
            '14/20 amino acid substitutions change function ; function changing are:  D : 73 , P : 66 , G : 57 , W : 55 , N : 53 , T : 52 , Y : 50 , E : 50 , L : 46 , S : 46 , F : 44 , Q : 44 , V : 44 , H : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '382',
          Color: '#FF8F8F',
          Description:
            '13/20 amino acid substitutions change function ; function changing are:  D : 71 , E : 64 , G : 61 , P : 60 , W : 55 , F : 50 , Y : 49 , T : 48 , N : 45 , Q : 44 , V : 42 , I : 42 , S : 42 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '383',
          Color: '#FFA3A3',
          Description:
            '12/20 amino acid substitutions change function ; function changing are:  D : 68 , G : 66 , E : 66 , N : 61 , A : 58 , W : 54 , S : 51 , H : 50 , Q : 50 , Y : 48 , C : 47 , T : 44 '
        },
        {
          Name: 'Highly sensitive',
          Residue: '386',
          Color: '#FFB8B8',
          Description:
            '11/20 amino acid substitutions change function ; function changing are:  D : 69 , G : 59 , N : 58 , E : 58 , P : 55 , W : 52 , S : 52 , T : 49 , Y : 46 , A : 42 , L : 42 '
        },
        {
          Name: 'Highly insensitive',
          Residue: '387',
          Color: '#6666FF',
          Description:
            '15/20 amino acid substitutions do (with high probability) not change function'
        },
        {
          Name: 'Highly insensitive',
          Residue: '389',
          Color: '#7A7AFF',
          Description:
            '14/20 amino acid substitutions do (with high probability) not change function'
        }
      ]
    },
    'Mutation score (average SNAP2 score)': {
      Source: 'SNAP2',
      URL: 'http://rostlab.org/services/snap2web/',
      Description:
        'Average mutational effect score at sequence position: The mutational effect scores were calculated using the SNAP2 prediction method. Positive scores (red) indicate residue positions that are highly sensitive, i.e., most of the 20 possible single amino acid polymorphisms will cause loss of function. Negative scores (blue) indicates residue positions that are highly insensitive, i.e., most of the 20 possible single amino acid polymorphisms will not effect function. Scores close to zero (white) indicate residue positions with normal sensitivity, i.e., some mutations might affect function, others will proably not.',
      Features: [
        {
          Name: 'Mutation score',
          Residue: '1',
          Color: '#FFE0E0',
          Description:
            'avrg. score: 12.4 ; function changing are:  D : 55 , K : 51 , P : 50 '
        },
        {
          Name: 'Mutation score',
          Residue: '2',
          Color: '#9090FF',
          Description: 'avrg. score: -43.5'
        },
        {
          Name: 'Mutation score',
          Residue: '3',
          Color: '#A2A2FF',
          Description: 'avrg. score: -36.5'
        },
        {
          Name: 'Mutation score',
          Residue: '4',
          Color: '#7575FF',
          Description: 'avrg. score: -54.1'
        },
        {
          Name: 'Mutation score',
          Residue: '5',
          Color: '#7E7EFF',
          Description: 'avrg. score: -50.5'
        },
        {
          Name: 'Mutation score',
          Residue: '6',
          Color: '#7373FF',
          Description: 'avrg. score: -55.0'
        },
        {
          Name: 'Mutation score',
          Residue: '7',
          Color: '#E6E6FF',
          Description: 'avrg. score: -10.1'
        },
        {
          Name: 'Mutation score',
          Residue: '8',
          Color: '#8585FF',
          Description: 'avrg. score: -47.8'
        },
        {
          Name: 'Mutation score',
          Residue: '9',
          Color: '#7373FF',
          Description: 'avrg. score: -54.9'
        },
        {
          Name: 'Mutation score',
          Residue: '10',
          Color: '#7070FF',
          Description: 'avrg. score: -56.1'
        },
        {
          Name: 'Mutation score',
          Residue: '11',
          Color: '#FFD0D0',
          Description:
            'avrg. score: 18.6 ; function changing are:  K : 73 , V : 63 , G : 63 , D : 56 , T : 54 , H : 51 , Q : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '12',
          Color: '#B1B1FF',
          Description: 'avrg. score: -30.6'
        },
        {
          Name: 'Mutation score',
          Residue: '13',
          Color: '#F6F6FF',
          Description: 'avrg. score: -3.6'
        },
        {
          Name: 'Mutation score',
          Residue: '14',
          Color: '#FFF5F5',
          Description: 'avrg. score: 4.2'
        },
        {
          Name: 'Mutation score',
          Residue: '15',
          Color: '#F3F3FF',
          Description: 'avrg. score: -4.7'
        },
        {
          Name: 'Mutation score',
          Residue: '16',
          Color: '#FFF2F2',
          Description: 'avrg. score: 5.2'
        },
        {
          Name: 'Mutation score',
          Residue: '17',
          Color: '#FFDEDE',
          Description:
            'avrg. score: 13.0 ; function changing are:  W : 52 , P : 46 , F : 46 , Y : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '18',
          Color: '#FF9D9D',
          Description:
            'avrg. score: 38.5 ; function changing are:  P : 69 , R : 65 , K : 62 , D : 60 , F : 59 , Y : 57 , W : 56 , L : 55 , I : 52 , G : 52 , H : 51 , E : 51 , N : 50 , C : 45 , Q : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '19',
          Color: '#FF4D4D',
          Description:
            'avrg. score: 69.6 ; function changing are:  P : 90 , K : 89 , R : 87 , D : 86 , H : 85 , G : 84 , E : 82 , N : 82 , Q : 82 , T : 80 , S : 77 , V : 75 , M : 74 , I : 71 , Y : 71 , W : 69 , A : 68 , L : 57 , C : 51 '
        },
        {
          Name: 'Mutation score',
          Residue: '20',
          Color: '#8484FF',
          Description: 'avrg. score: -48.2'
        },
        {
          Name: 'Mutation score',
          Residue: '21',
          Color: '#FFA7A7',
          Description:
            'avrg. score: 34.4 ; function changing are:  P : 74 , R : 68 , W : 66 , M : 57 , G : 56 , L : 53 , H : 53 , F : 53 , N : 50 , I : 50 , V : 50 , S : 49 , T : 49 '
        },
        {
          Name: 'Mutation score',
          Residue: '22',
          Color: '#FFA7A7',
          Description:
            'avrg. score: 34.6 ; function changing are:  K : 66 , D : 66 , N : 65 , E : 63 , R : 62 , G : 60 , P : 60 , S : 58 , Q : 58 , W : 55 , T : 55 , Y : 51 , H : 48 , A : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '23',
          Color: '#FF6B6B',
          Description:
            'avrg. score: 58.2 ; function changing are:  P : 84 , R : 79 , K : 78 , H : 77 , N : 74 , D : 74 , Q : 73 , E : 71 , L : 70 , T : 69 , S : 68 , I : 67 , A : 63 , V : 60 , G : 58 , C : 56 , M : 55 '
        },
        {
          Name: 'Mutation score',
          Residue: '24',
          Color: '#ABABFF',
          Description: 'avrg. score: -33.1'
        },
        {
          Name: 'Mutation score',
          Residue: '25',
          Color: '#B8B8FF',
          Description: 'avrg. score: -28.1'
        },
        {
          Name: 'Mutation score',
          Residue: '26',
          Color: '#FFBEBE',
          Description:
            'avrg. score: 25.7 ; function changing are:  H : 65 , D : 63 , G : 58 , P : 57 , K : 57 , E : 55 , R : 44 , W : 43 , A : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '27',
          Color: '#D5D5FF',
          Description: 'avrg. score: -16.6'
        },
        {
          Name: 'Mutation score',
          Residue: '28',
          Color: '#8989FF',
          Description: 'avrg. score: -46.2'
        },
        {
          Name: 'Mutation score',
          Residue: '29',
          Color: '#8989FF',
          Description: 'avrg. score: -46.1'
        },
        {
          Name: 'Mutation score',
          Residue: '30',
          Color: '#AEAEFF',
          Description: 'avrg. score: -31.9'
        },
        {
          Name: 'Mutation score',
          Residue: '31',
          Color: '#FFE1E1',
          Description:
            'avrg. score: 11.9 ; function changing are:  H : 73 , D : 59 , G : 57 , E : 56 , A : 49 '
        },
        {
          Name: 'Mutation score',
          Residue: '32',
          Color: '#B7B7FF',
          Description: 'avrg. score: -28.4'
        },
        {
          Name: 'Mutation score',
          Residue: '33',
          Color: '#7676FF',
          Description: 'avrg. score: -53.9'
        },
        {
          Name: 'Mutation score',
          Residue: '34',
          Color: '#7979FF',
          Description: 'avrg. score: -52.5'
        },
        {
          Name: 'Mutation score',
          Residue: '35',
          Color: '#9292FF',
          Description: 'avrg. score: -42.6'
        },
        {
          Name: 'Mutation score',
          Residue: '36',
          Color: '#A9A9FF',
          Description: 'avrg. score: -33.8'
        },
        {
          Name: 'Mutation score',
          Residue: '37',
          Color: '#AEAEFF',
          Description: 'avrg. score: -31.7'
        },
        {
          Name: 'Mutation score',
          Residue: '38',
          Color: '#7474FF',
          Description: 'avrg. score: -54.6'
        },
        {
          Name: 'Mutation score',
          Residue: '39',
          Color: '#AAAAFF',
          Description: 'avrg. score: -33.4'
        },
        {
          Name: 'Mutation score',
          Residue: '40',
          Color: '#FFD7D7',
          Description:
            'avrg. score: 15.9 ; function changing are:  K : 51 , P : 49 , D : 46 , R : 46 , G : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '41',
          Color: '#E5E5FF',
          Description: 'avrg. score: -10.4'
        },
        {
          Name: 'Mutation score',
          Residue: '42',
          Color: '#B1B1FF',
          Description: 'avrg. score: -30.8'
        },
        {
          Name: 'Mutation score',
          Residue: '43',
          Color: '#FFFFFF',
          Description:
            'avrg. score: 0.3 ; function changing are:  K : 48 , P : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '44',
          Color: '#E0E0FF',
          Description: 'avrg. score: -12.5'
        },
        {
          Name: 'Mutation score',
          Residue: '45',
          Color: '#FFC1C1',
          Description:
            'avrg. score: 24.4 ; function changing are:  D : 65 , K : 59 , P : 55 , G : 51 , H : 47 , R : 47 , E : 46 '
        },
        {
          Name: 'Mutation score',
          Residue: '46',
          Color: '#9191FF',
          Description: 'avrg. score: -43.2'
        },
        {
          Name: 'Mutation score',
          Residue: '47',
          Color: '#FFFBFB',
          Description:
            'avrg. score: 1.7 ; function changing are:  R : 58 , M : 55 , E : 54 , D : 53 , H : 50 , L : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '48',
          Color: '#C7C7FF',
          Description: 'avrg. score: -22.1'
        },
        {
          Name: 'Mutation score',
          Residue: '49',
          Color: '#F7F7FF',
          Description: 'avrg. score: -3.2'
        },
        {
          Name: 'Mutation score',
          Residue: '50',
          Color: '#F8F8FF',
          Description: 'avrg. score: -2.8'
        },
        {
          Name: 'Mutation score',
          Residue: '51',
          Color: '#ABABFF',
          Description: 'avrg. score: -33.0'
        },
        {
          Name: 'Mutation score',
          Residue: '52',
          Color: '#C6C6FF',
          Description: 'avrg. score: -22.4'
        },
        {
          Name: 'Mutation score',
          Residue: '53',
          Color: '#FFCCCC',
          Description:
            'avrg. score: 20.1 ; function changing are:  K : 52 , R : 47 , D : 44 , E : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '54',
          Color: '#FFF8F8',
          Description: 'avrg. score: 3.0'
        },
        {
          Name: 'Mutation score',
          Residue: '55',
          Color: '#9191FF',
          Description: 'avrg. score: -43.1'
        },
        {
          Name: 'Mutation score',
          Residue: '56',
          Color: '#EDEDFF',
          Description: 'avrg. score: -7.4'
        },
        {
          Name: 'Mutation score',
          Residue: '57',
          Color: '#C7C7FF',
          Description: 'avrg. score: -22.1'
        },
        {
          Name: 'Mutation score',
          Residue: '58',
          Color: '#D0D0FF',
          Description: 'avrg. score: -18.7'
        },
        {
          Name: 'Mutation score',
          Residue: '59',
          Color: '#A0A0FF',
          Description: 'avrg. score: -37.2'
        },
        {
          Name: 'Mutation score',
          Residue: '60',
          Color: '#C5C5FF',
          Description: 'avrg. score: -22.8'
        },
        {
          Name: 'Mutation score',
          Residue: '61',
          Color: '#DFDFFF',
          Description: 'avrg. score: -12.7'
        },
        {
          Name: 'Mutation score',
          Residue: '62',
          Color: '#DFDFFF',
          Description: 'avrg. score: -12.8'
        },
        {
          Name: 'Mutation score',
          Residue: '63',
          Color: '#7E7EFF',
          Description: 'avrg. score: -50.6'
        },
        {
          Name: 'Mutation score',
          Residue: '64',
          Color: '#B2B2FF',
          Description: 'avrg. score: -30.4'
        },
        {
          Name: 'Mutation score',
          Residue: '65',
          Color: '#C1C1FF',
          Description: 'avrg. score: -24.5'
        },
        {
          Name: 'Mutation score',
          Residue: '66',
          Color: '#BBBBFF',
          Description: 'avrg. score: -26.9'
        },
        {
          Name: 'Mutation score',
          Residue: '67',
          Color: '#B0B0FF',
          Description: 'avrg. score: -31.2'
        },
        {
          Name: 'Mutation score',
          Residue: '68',
          Color: '#B7B7FF',
          Description: 'avrg. score: -28.4'
        },
        {
          Name: 'Mutation score',
          Residue: '69',
          Color: '#5757FF',
          Description: 'avrg. score: -66.0'
        },
        {
          Name: 'Mutation score',
          Residue: '70',
          Color: '#4646FF',
          Description: 'avrg. score: -72.4'
        },
        {
          Name: 'Mutation score',
          Residue: '71',
          Color: '#9D9DFF',
          Description: 'avrg. score: -38.3'
        },
        {
          Name: 'Mutation score',
          Residue: '72',
          Color: '#FFECEC',
          Description:
            'avrg. score: 7.5 ; function changing are:  R : 62 , F : 60 , L : 49 , V : 46 , H : 45 , I : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '73',
          Color: '#AAAAFF',
          Description: 'avrg. score: -33.5'
        },
        {
          Name: 'Mutation score',
          Residue: '74',
          Color: '#6B6BFF',
          Description: 'avrg. score: -58.1'
        },
        {
          Name: 'Mutation score',
          Residue: '75',
          Color: '#8D8DFF',
          Description: 'avrg. score: -44.9'
        },
        {
          Name: 'Mutation score',
          Residue: '76',
          Color: '#6767FF',
          Description: 'avrg. score: -59.7'
        },
        {
          Name: 'Mutation score',
          Residue: '77',
          Color: '#A7A7FF',
          Description: 'avrg. score: -34.6'
        },
        {
          Name: 'Mutation score',
          Residue: '78',
          Color: '#6E6EFF',
          Description: 'avrg. score: -56.9'
        },
        {
          Name: 'Mutation score',
          Residue: '79',
          Color: '#6464FF',
          Description: 'avrg. score: -60.6'
        },
        {
          Name: 'Mutation score',
          Residue: '80',
          Color: '#A3A3FF',
          Description: 'avrg. score: -36.0'
        },
        {
          Name: 'Mutation score',
          Residue: '81',
          Color: '#7B7BFF',
          Description: 'avrg. score: -52.0'
        },
        {
          Name: 'Mutation score',
          Residue: '82',
          Color: '#ECECFF',
          Description: 'avrg. score: -7.7'
        },
        {
          Name: 'Mutation score',
          Residue: '83',
          Color: '#FFFDFD',
          Description:
            'avrg. score: 0.9 ; function changing are:  W : 78 , H : 63 , F : 60 , P : 52 , D : 51 '
        },
        {
          Name: 'Mutation score',
          Residue: '84',
          Color: '#9696FF',
          Description: 'avrg. score: -41.4'
        },
        {
          Name: 'Mutation score',
          Residue: '85',
          Color: '#D0D0FF',
          Description: 'avrg. score: -18.4'
        },
        {
          Name: 'Mutation score',
          Residue: '86',
          Color: '#CBCBFF',
          Description: 'avrg. score: -20.4'
        },
        {
          Name: 'Mutation score',
          Residue: '87',
          Color: '#7E7EFF',
          Description: 'avrg. score: -50.4'
        },
        {
          Name: 'Mutation score',
          Residue: '88',
          Color: '#6B6BFF',
          Description: 'avrg. score: -58.0'
        },
        {
          Name: 'Mutation score',
          Residue: '89',
          Color: '#8686FF',
          Description: 'avrg. score: -47.4'
        },
        {
          Name: 'Mutation score',
          Residue: '90',
          Color: '#8787FF',
          Description: 'avrg. score: -47.0'
        },
        {
          Name: 'Mutation score',
          Residue: '91',
          Color: '#FFF8F8',
          Description: 'avrg. score: 2.8'
        },
        {
          Name: 'Mutation score',
          Residue: '92',
          Color: '#FFE7E7',
          Description: 'avrg. score: 9.6'
        },
        {
          Name: 'Mutation score',
          Residue: '93',
          Color: '#FFF5F5',
          Description:
            'avrg. score: 4.0 ; function changing are:  D : 53 , G : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '94',
          Color: '#FFFFFF',
          Description: 'avrg. score: 0.3'
        },
        {
          Name: 'Mutation score',
          Residue: '95',
          Color: '#FFE3E3',
          Description: 'avrg. score: 11.2 ; function changing are:  D : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '96',
          Color: '#CBCBFF',
          Description: 'avrg. score: -20.6'
        },
        {
          Name: 'Mutation score',
          Residue: '97',
          Color: '#FFB9B9',
          Description:
            'avrg. score: 27.4 ; function changing are:  D : 55 , K : 50 , R : 48 , G : 47 , H : 46 , E : 46 , N : 43 , W : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '98',
          Color: '#FFBEBE',
          Description:
            'avrg. score: 25.8 ; function changing are:  D : 55 , R : 44 , W : 43 , E : 42 , K : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '99',
          Color: '#9696FF',
          Description: 'avrg. score: -41.2'
        },
        {
          Name: 'Mutation score',
          Residue: '100',
          Color: '#6C6CFF',
          Description: 'avrg. score: -57.8'
        },
        {
          Name: 'Mutation score',
          Residue: '101',
          Color: '#F5F5FF',
          Description:
            'avrg. score: -4.1 ; function changing are:  F : 46 , W : 46 , Y : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '102',
          Color: '#C5C5FF',
          Description: 'avrg. score: -23.0'
        },
        {
          Name: 'Mutation score',
          Residue: '103',
          Color: '#FF5151',
          Description:
            'avrg. score: 68.2 ; function changing are:  K : 87 , E : 85 , D : 85 , P : 84 , R : 83 , N : 83 , G : 83 , T : 82 , Q : 79 , S : 79 , M : 76 , L : 73 , A : 72 , W : 70 , I : 70 , V : 67 , C : 67 , F : 50 , H : 46 '
        },
        {
          Name: 'Mutation score',
          Residue: '104',
          Color: '#9B9BFF',
          Description: 'avrg. score: -39.5'
        },
        {
          Name: 'Mutation score',
          Residue: '105',
          Color: '#FF6A6A',
          Description:
            'avrg. score: 58.4 ; function changing are:  W : 80 , K : 80 , E : 78 , Y : 77 , L : 73 , D : 73 , R : 72 , I : 72 , P : 72 , V : 70 , Q : 69 , F : 67 , H : 67 , T : 61 , C : 61 , A : 59 , N : 59 , M : 55 '
        },
        {
          Name: 'Mutation score',
          Residue: '106',
          Color: '#7272FF',
          Description: 'avrg. score: -55.2'
        },
        {
          Name: 'Mutation score',
          Residue: '107',
          Color: '#FF7171',
          Description:
            'avrg. score: 55.8 ; function changing are:  P : 88 , K : 88 , R : 83 , E : 83 , Q : 82 , D : 82 , N : 77 , G : 76 , M : 75 , T : 75 , I : 65 , A : 62 , W : 56 , S : 55 , V : 54 , L : 50 '
        },
        {
          Name: 'Mutation score',
          Residue: '108',
          Color: '#FFABAB',
          Description:
            'avrg. score: 33.1 ; function changing are:  K : 77 , P : 75 , W : 75 , Y : 73 , E : 66 , M : 61 , I : 60 , L : 58 , F : 58 , V : 53 , T : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '109',
          Color: '#FF5252',
          Description:
            'avrg. score: 67.7 ; function changing are:  K : 88 , R : 86 , P : 86 , E : 85 , D : 85 , H : 83 , Q : 82 , T : 80 , G : 80 , W : 79 , N : 79 , S : 75 , Y : 71 , A : 69 , I : 67 , M : 60 , C : 60 , V : 60 , L : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '110',
          Color: '#FFEDED',
          Description:
            'avrg. score: 7.0 ; function changing are:  V : 91 , W : 69 , F : 62 , Y : 59 , M : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '111',
          Color: '#FF8181',
          Description:
            'avrg. score: 49.5 ; function changing are:  D : 80 , E : 77 , P : 76 , R : 76 , K : 75 , N : 74 , H : 73 , Q : 70 , G : 70 , W : 70 , S : 63 , Y : 63 , A : 51 , T : 48 , F : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '112',
          Color: '#6969FF',
          Description: 'avrg. score: -58.8'
        },
        {
          Name: 'Mutation score',
          Residue: '113',
          Color: '#FF7B7B',
          Description:
            'avrg. score: 51.9 ; function changing are:  K : 77 , E : 75 , R : 75 , P : 73 , D : 73 , H : 68 , G : 68 , N : 66 , Q : 62 , W : 60 , T : 58 , A : 57 , S : 53 , C : 49 , V : 48 , L : 45 , Y : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '114',
          Color: '#A0A0FF',
          Description: 'avrg. score: -37.5'
        },
        {
          Name: 'Mutation score',
          Residue: '115',
          Color: '#C4C4FF',
          Description: 'avrg. score: -23.2'
        },
        {
          Name: 'Mutation score',
          Residue: '116',
          Color: '#FFE7E7',
          Description: 'avrg. score: 9.8 ; function changing are:  W : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '117',
          Color: '#FFBFBF',
          Description:
            'avrg. score: 25.1 ; function changing are:  W : 54 , D : 53 , K : 51 , R : 49 , F : 49 , Y : 47 , L : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '118',
          Color: '#FFB1B1',
          Description:
            'avrg. score: 30.6 ; function changing are:  R : 56 , D : 54 , P : 53 , G : 51 , F : 45 , I : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '119',
          Color: '#FFA0A0',
          Description:
            'avrg. score: 37.2 ; function changing are:  D : 60 , E : 60 , K : 58 , W : 58 , Q : 51 , P : 49 , H : 46 , N : 46 , I : 46 , Y : 44 , L : 43 , V : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '120',
          Color: '#FF6B6B',
          Description:
            'avrg. score: 57.9 ; function changing are:  D : 85 , N : 77 , P : 75 , E : 74 , W : 72 , G : 71 , T : 69 , F : 68 , S : 66 , L : 65 , I : 63 , Q : 61 , V : 61 , M : 57 , Y : 56 , H : 54 , C : 54 , R : 52 , A : 52 '
        },
        {
          Name: 'Mutation score',
          Residue: '121',
          Color: '#FFA9A9',
          Description:
            'avrg. score: 33.8 ; function changing are:  P : 65 , W : 55 , D : 54 , E : 51 , L : 49 , I : 45 , G : 44 , F : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '122',
          Color: '#FF9797',
          Description:
            'avrg. score: 40.9 ; function changing are:  D : 73 , G : 67 , E : 64 , R : 64 , W : 64 , K : 63 , H : 60 , Q : 57 , N : 54 , P : 54 , S : 44 , M : 42 , F : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '123',
          Color: '#FFB8B8',
          Description:
            'avrg. score: 28.1 ; function changing are:  E : 52 , D : 49 , P : 48 , W : 47 , L : 45 , K : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '124',
          Color: '#FF6A6A',
          Description:
            'avrg. score: 58.3 ; function changing are:  P : 82 , E : 80 , Q : 79 , R : 78 , D : 76 , K : 76 , I : 75 , M : 69 , G : 68 , H : 68 , T : 64 , L : 58 , N : 57 , W : 57 , V : 54 , A : 48 , F : 46 , Y : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '125',
          Color: '#FF7171',
          Description:
            'avrg. score: 55.5 ; function changing are:  V : 93 , P : 80 , D : 75 , E : 71 , G : 71 , R : 69 , W : 69 , N : 68 , K : 68 , H : 63 , Q : 63 , L : 57 , Y : 55 , C : 51 , M : 50 , I : 48 , F : 48 , A : 46 , S : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '126',
          Color: '#FF3C3C',
          Description:
            'avrg. score: 76.2 ; function changing are:  P : 93 , K : 92 , R : 91 , E : 89 , T : 88 , G : 88 , N : 88 , D : 87 , H : 87 , Q : 86 , S : 86 , M : 86 , L : 82 , A : 79 , I : 79 , C : 77 , V : 74 , W : 69 , F : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '127',
          Color: '#FF5555',
          Description:
            'avrg. score: 66.5 ; function changing are:  P : 89 , D : 84 , L : 83 , F : 79 , I : 79 , G : 79 , E : 78 , V : 77 , W : 75 , K : 75 , H : 75 , M : 74 , Y : 73 , Q : 71 , R : 68 , N : 68 , A : 67 , C : 65 , T : 59 '
        },
        {
          Name: 'Mutation score',
          Residue: '128',
          Color: '#6464FF',
          Description: 'avrg. score: -60.9'
        },
        {
          Name: 'Mutation score',
          Residue: '129',
          Color: '#3939FF',
          Description: 'avrg. score: -77.5'
        },
        {
          Name: 'Mutation score',
          Residue: '130',
          Color: '#FF6D6D',
          Description:
            'avrg. score: 57.3 ; function changing are:  D : 83 , R : 79 , P : 79 , G : 78 , E : 76 , N : 76 , K : 76 , T : 71 , H : 68 , S : 66 , Q : 66 , W : 66 , A : 61 , F : 60 , Y : 60 , M : 48 , V : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '131',
          Color: '#FFE8E8',
          Description: 'avrg. score: 9.3 ; function changing are:  W : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '132',
          Color: '#FF5353',
          Description:
            'avrg. score: 67.5 ; function changing are:  D : 89 , P : 88 , E : 87 , W : 85 , G : 82 , Y : 79 , N : 78 , H : 76 , I : 76 , V : 75 , F : 75 , L : 74 , S : 69 , A : 69 , R : 67 , C : 67 , Q : 66 , T : 65 , M : 53 '
        },
        {
          Name: 'Mutation score',
          Residue: '133',
          Color: '#FFB4B4',
          Description:
            'avrg. score: 29.4 ; function changing are:  P : 64 , D : 62 , E : 61 , R : 57 , K : 54 , N : 54 , G : 51 , H : 47 , W : 45 , S : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '134',
          Color: '#FF4848',
          Description:
            'avrg. score: 71.6 ; function changing are:  D : 90 , P : 90 , R : 87 , K : 86 , E : 86 , G : 85 , H : 84 , T : 83 , N : 83 , Q : 83 , S : 83 , L : 80 , W : 77 , V : 75 , A : 73 , I : 73 , M : 70 , C : 67 '
        },
        {
          Name: 'Mutation score',
          Residue: '135',
          Color: '#FF8989',
          Description:
            'avrg. score: 46.1 ; function changing are:  I : 89 , P : 73 , D : 70 , W : 68 , E : 66 , G : 65 , R : 63 , Y : 62 , Q : 60 , H : 59 , N : 59 , F : 58 , K : 55 , M : 46 , S : 45 , L : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '136',
          Color: '#FFABAB',
          Description:
            'avrg. score: 33.0 ; function changing are:  P : 61 , W : 59 , F : 53 , G : 52 , E : 52 , T : 48 , L : 47 , D : 47 , I : 44 , H : 42 , M : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '137',
          Color: '#FFA5A5',
          Description:
            'avrg. score: 35.2 ; function changing are:  D : 77 , E : 72 , K : 70 , R : 68 , N : 68 , G : 62 , H : 62 , Q : 60 , S : 59 , P : 52 , A : 51 , Y : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '138',
          Color: '#FFA6A6',
          Description:
            'avrg. score: 34.8 ; function changing are:  P : 75 , W : 64 , Y : 59 , F : 58 , D : 53 , L : 53 , K : 50 , E : 49 , R : 48 , H : 46 , T : 42 , G : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '139',
          Color: '#FF7C7C',
          Description:
            'avrg. score: 51.5 ; function changing are:  D : 84 , P : 78 , W : 75 , E : 71 , F : 69 , G : 69 , N : 64 , I : 60 , Q : 58 , Y : 57 , L : 56 , S : 55 , R : 53 , T : 49 , A : 44 , C : 42 , V : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '140',
          Color: '#FFADAD',
          Description:
            'avrg. score: 32.2 ; function changing are:  D : 60 , E : 57 , W : 56 , R : 56 , P : 53 , G : 53 , Y : 49 , K : 47 , Q : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '141',
          Color: '#FF9595',
          Description:
            'avrg. score: 41.7 ; function changing are:  P : 69 , D : 69 , E : 65 , R : 64 , G : 63 , W : 61 , K : 60 , N : 58 , Y : 56 , Q : 54 , M : 50 , H : 48 , L : 48 , I : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '142',
          Color: '#FF7474',
          Description:
            'avrg. score: 54.4 ; function changing are:  D : 80 , K : 77 , E : 76 , G : 73 , W : 72 , R : 70 , Y : 69 , N : 68 , F : 66 , H : 64 , V : 62 , I : 60 , Q : 57 , C : 56 , S : 55 , M : 54 , T : 51 , A : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '143',
          Color: '#FFB9B9',
          Description:
            'avrg. score: 27.6 ; function changing are:  D : 66 , K : 63 , E : 62 , G : 58 , H : 57 , N : 56 , P : 54 , Q : 52 , W : 48 , S : 48 , Y : 46 , R : 43 , T : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '144',
          Color: '#FFDFDF',
          Description:
            'avrg. score: 12.8 ; function changing are:  P : 62 , W : 52 , F : 47 , I : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '145',
          Color: '#FFC8C8',
          Description:
            'avrg. score: 21.9 ; function changing are:  D : 66 , K : 64 , E : 62 , R : 60 , N : 57 , P : 57 , G : 56 , H : 53 , Q : 51 , S : 50 , W : 46 , T : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '146',
          Color: '#FFF6F6',
          Description:
            'avrg. score: 3.5 ; function changing are:  P : 55 , D : 41 , G : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '147',
          Color: '#FF9797',
          Description:
            'avrg. score: 40.6 ; function changing are:  D : 74 , E : 71 , R : 70 , K : 69 , H : 68 , N : 67 , P : 67 , G : 58 , Q : 56 , S : 55 , Y : 51 , A : 47 , F : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '148',
          Color: '#D0D0FF',
          Description:
            'avrg. score: -18.5 ; function changing are:  W : 57 , Y : 51 '
        },
        {
          Name: 'Mutation score',
          Residue: '149',
          Color: '#8080FF',
          Description: 'avrg. score: -49.9'
        },
        {
          Name: 'Mutation score',
          Residue: '150',
          Color: '#6767FF',
          Description: 'avrg. score: -59.6'
        },
        {
          Name: 'Mutation score',
          Residue: '151',
          Color: '#FFA1A1',
          Description:
            'avrg. score: 37.1 ; function changing are:  D : 76 , G : 70 , E : 69 , R : 67 , W : 63 , K : 59 , Y : 59 , N : 52 , H : 51 , T : 51 , C : 47 , F : 47 , S : 44 , Q : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '152',
          Color: '#FFB5B5',
          Description:
            'avrg. score: 29.2 ; function changing are:  D : 63 , G : 59 , R : 56 , K : 55 , W : 53 , E : 49 , F : 48 , Y : 47 , S : 43 , N : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '153',
          Color: '#9292FF',
          Description: 'avrg. score: -42.8'
        },
        {
          Name: 'Mutation score',
          Residue: '154',
          Color: '#FFABAB',
          Description:
            'avrg. score: 33.0 ; function changing are:  K : 63 , E : 63 , W : 60 , D : 56 , H : 53 , R : 52 , F : 50 , I : 48 , P : 48 , T : 46 , V : 45 , Q : 45 , M : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '155',
          Color: '#FFD6D6',
          Description:
            'avrg. score: 16.1 ; function changing are:  D : 57 , E : 51 , P : 45 , K : 44 , R : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '156',
          Color: '#FFC6C6',
          Description:
            'avrg. score: 22.5 ; function changing are:  D : 83 , W : 70 , E : 64 , G : 57 , P : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '157',
          Color: '#FF7C7C',
          Description:
            'avrg. score: 51.2 ; function changing are:  K : 85 , D : 85 , W : 84 , R : 84 , E : 82 , Q : 81 , G : 80 , N : 80 , Y : 79 , H : 78 , P : 76 , S : 75 , F : 73 , T : 71 , M : 64 , A : 59 '
        },
        {
          Name: 'Mutation score',
          Residue: '158',
          Color: '#FF3131',
          Description:
            'avrg. score: 80.5 ; function changing are:  D : 95 , W : 94 , P : 93 , E : 93 , F : 92 , Y : 92 , L : 92 , N : 92 , G : 92 , S : 90 , I : 90 , M : 89 , T : 88 , K : 87 , V : 87 , A : 86 , Q : 84 , C : 72 , H : 51 '
        },
        {
          Name: 'Mutation score',
          Residue: '159',
          Color: '#FF5C5C',
          Description:
            'avrg. score: 64.0 ; function changing are:  P : 88 , D : 87 , W : 87 , E : 86 , K : 86 , H : 85 , Y : 85 , R : 84 , F : 84 , L : 81 , N : 81 , Q : 75 , I : 70 , C : 64 , V : 64 , M : 62 , S : 60 '
        },
        {
          Name: 'Mutation score',
          Residue: '160',
          Color: '#FF9999',
          Description:
            'avrg. score: 40.0 ; function changing are:  E : 84 , K : 84 , D : 82 , N : 81 , W : 81 , G : 80 , R : 80 , P : 79 , S : 72 , H : 68 , Q : 64 , Y : 61 , C : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '161',
          Color: '#FF9797',
          Description:
            'avrg. score: 40.8 ; function changing are:  W : 72 , D : 71 , E : 71 , K : 68 , F : 67 , Y : 66 , R : 63 , H : 60 , Q : 57 , N : 57 , I : 54 , G : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '162',
          Color: '#FFADAD',
          Description:
            'avrg. score: 32.1 ; function changing are:  D : 73 , P : 67 , N : 64 , K : 64 , H : 61 , E : 60 , G : 59 , W : 59 , R : 55 , Q : 53 , S : 52 , Y : 51 , T : 47 , F : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '163',
          Color: '#FF2929',
          Description:
            'avrg. score: 83.7 ; function changing are:  P : 97 , K : 96 , R : 95 , T : 94 , D : 94 , N : 94 , E : 93 , G : 93 , M : 92 , S : 92 , Q : 92 , L : 91 , H : 91 , W : 90 , I : 88 , V : 86 , A : 85 , C : 71 , F : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '164',
          Color: '#FFACAC',
          Description:
            'avrg. score: 32.5 ; function changing are:  D : 75 , P : 74 , E : 60 , N : 60 , W : 59 , G : 54 , F : 53 , Q : 46 , H : 42 , I : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '165',
          Color: '#FFFBFB',
          Description: 'avrg. score: 1.6 ; function changing are:  P : 53 '
        },
        {
          Name: 'Mutation score',
          Residue: '166',
          Color: '#EAEAFF',
          Description: 'avrg. score: -8.4'
        },
        {
          Name: 'Mutation score',
          Residue: '167',
          Color: '#FFF4F4',
          Description:
            'avrg. score: 4.6 ; function changing are:  P : 47 , G : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '168',
          Color: '#FF8383',
          Description:
            'avrg. score: 48.7 ; function changing are:  E : 72 , P : 72 , R : 71 , G : 68 , K : 68 , T : 63 , D : 60 , A : 55 , I : 54 , N : 54 , V : 53 , L : 52 , S : 52 , M : 50 , C : 50 , Q : 46 , W : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '169',
          Color: '#FFACAC',
          Description:
            'avrg. score: 32.5 ; function changing are:  D : 73 , P : 72 , K : 72 , E : 71 , H : 64 , G : 60 , S : 60 , W : 60 , N : 58 , R : 46 , Q : 43 , A : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '170',
          Color: '#EAEAFF',
          Description: 'avrg. score: -8.3'
        },
        {
          Name: 'Mutation score',
          Residue: '171',
          Color: '#FFBBBB',
          Description:
            'avrg. score: 26.9 ; function changing are:  P : 63 , R : 60 , W : 52 , N : 52 , G : 47 , T : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '172',
          Color: '#FF9E9E',
          Description:
            'avrg. score: 38.1 ; function changing are:  D : 73 , K : 70 , E : 69 , H : 65 , W : 64 , R : 63 , G : 60 , Q : 60 , Y : 58 , N : 50 , T : 49 , S : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '173',
          Color: '#FF5656',
          Description:
            'avrg. score: 66.2 ; function changing are:  P : 88 , D : 86 , K : 85 , R : 85 , W : 84 , G : 84 , N : 83 , E : 83 , Q : 81 , Y : 80 , S : 78 , F : 76 , L : 76 , T : 73 , H : 71 , A : 63 , M : 63 , C : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '174',
          Color: '#FF9B9B',
          Description:
            'avrg. score: 39.2 ; function changing are:  D : 85 , P : 77 , G : 70 , W : 70 , F : 64 , E : 62 , Y : 59 , N : 57 , I : 53 , V : 51 , M : 47 , L : 46 , S : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '175',
          Color: '#FF3F3F',
          Description:
            'avrg. score: 75.0 ; function changing are:  H : 94 , D : 93 , P : 91 , W : 89 , G : 88 , N : 86 , E : 85 , F : 85 , L : 84 , S : 84 , Y : 84 , I : 83 , T : 81 , V : 79 , M : 79 , Q : 78 , K : 77 , A : 74 , C : 60 '
        },
        {
          Name: 'Mutation score',
          Residue: '176',
          Color: '#FF3F3F',
          Description:
            'avrg. score: 75.3 ; function changing are:  D : 91 , E : 90 , R : 88 , P : 88 , Q : 88 , G : 88 , W : 88 , K : 88 , H : 87 , N : 87 , L : 86 , F : 86 , S : 82 , M : 81 , T : 81 , Y : 80 , V : 79 , I : 75 , A : 68 '
        },
        {
          Name: 'Mutation score',
          Residue: '177',
          Color: '#FFE0E0',
          Description: 'avrg. score: 12.2 ; function changing are:  G : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '178',
          Color: '#FFBEBE',
          Description:
            'avrg. score: 25.8 ; function changing are:  P : 61 , D : 60 , K : 57 , E : 56 , R : 53 , G : 47 , W : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '179',
          Color: '#FF6464',
          Description:
            'avrg. score: 60.6 ; function changing are:  K : 85 , E : 82 , P : 82 , R : 80 , D : 77 , W : 77 , G : 75 , N : 72 , T : 72 , Q : 69 , I : 68 , V : 68 , F : 66 , A : 66 , M : 64 , S : 62 , Y : 60 , C : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '180',
          Color: '#FFFEFE',
          Description: 'avrg. score: 0.6 ; function changing are:  P : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '181',
          Color: '#FFF8F8',
          Description: 'avrg. score: 2.9 ; function changing are:  W : 46 '
        },
        {
          Name: 'Mutation score',
          Residue: '182',
          Color: '#8888FF',
          Description: 'avrg. score: -46.9'
        },
        {
          Name: 'Mutation score',
          Residue: '183',
          Color: '#7272FF',
          Description: 'avrg. score: -55.1'
        },
        {
          Name: 'Mutation score',
          Residue: '184',
          Color: '#FFD5D5',
          Description:
            'avrg. score: 16.8 ; function changing are:  W : 55 , I : 52 , V : 48 , H : 47 , M : 46 , F : 45 , Y : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '185',
          Color: '#8D8DFF',
          Description: 'avrg. score: -44.8'
        },
        {
          Name: 'Mutation score',
          Residue: '186',
          Color: '#FFE0E0',
          Description: 'avrg. score: 12.4'
        },
        {
          Name: 'Mutation score',
          Residue: '187',
          Color: '#FF9A9A',
          Description:
            'avrg. score: 39.6 ; function changing are:  R : 70 , W : 69 , Y : 62 , F : 62 , H : 62 , P : 59 , Q : 58 , L : 57 , M : 56 , I : 52 , V : 51 , K : 49 , E : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '188',
          Color: '#8686FF',
          Description: 'avrg. score: -47.5'
        },
        {
          Name: 'Mutation score',
          Residue: '189',
          Color: '#8C8CFF',
          Description: 'avrg. score: -45.1'
        },
        {
          Name: 'Mutation score',
          Residue: '190',
          Color: '#C1C1FF',
          Description: 'avrg. score: -24.4'
        },
        {
          Name: 'Mutation score',
          Residue: '191',
          Color: '#B6B6FF',
          Description: 'avrg. score: -28.9'
        },
        {
          Name: 'Mutation score',
          Residue: '192',
          Color: '#D5D5FF',
          Description: 'avrg. score: -16.4'
        },
        {
          Name: 'Mutation score',
          Residue: '193',
          Color: '#FF6969',
          Description:
            'avrg. score: 58.8 ; function changing are:  P : 83 , K : 82 , D : 80 , E : 76 , R : 73 , G : 73 , T : 67 , Y : 67 , N : 67 , W : 65 , L : 65 , M : 64 , Q : 62 , C : 59 , A : 58 , I : 56 , S : 54 , V : 54 , F : 52 '
        },
        {
          Name: 'Mutation score',
          Residue: '194',
          Color: '#FF8B8B',
          Description:
            'avrg. score: 45.6 ; function changing are:  P : 76 , D : 76 , K : 73 , E : 72 , R : 71 , G : 71 , Q : 63 , W : 60 , N : 59 , S : 58 , T : 57 , A : 56 , Y : 50 , H : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '195',
          Color: '#FFD5D5',
          Description:
            'avrg. score: 16.8 ; function changing are:  D : 62 , P : 60 , K : 54 , E : 54 , G : 53 , N : 52 '
        },
        {
          Name: 'Mutation score',
          Residue: '196',
          Color: '#FF6F6F',
          Description:
            'avrg. score: 56.6 ; function changing are:  D : 88 , P : 85 , E : 80 , W : 79 , G : 78 , N : 77 , F : 73 , Y : 71 , L : 71 , K : 69 , M : 66 , T : 63 , S : 60 , A : 59 , V : 56 , I : 52 , H : 49 '
        },
        {
          Name: 'Mutation score',
          Residue: '197',
          Color: '#FFBBBB',
          Description:
            'avrg. score: 26.9 ; function changing are:  P : 67 , W : 60 , K : 58 , D : 56 , Y : 54 , F : 51 , G : 50 , E : 47 , R : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '198',
          Color: '#FFB3B3',
          Description:
            'avrg. score: 30.1 ; function changing are:  P : 71 , R : 66 , W : 54 , K : 53 , L : 51 , F : 47 , Y : 46 '
        },
        {
          Name: 'Mutation score',
          Residue: '199',
          Color: '#FF9D9D',
          Description:
            'avrg. score: 38.6 ; function changing are:  W : 70 , Y : 64 , R : 62 , D : 60 , K : 59 , F : 58 , I : 55 , E : 52 , V : 52 , L : 46 , P : 46 , M : 43 , T : 41 , C : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '200',
          Color: '#FFE3E3',
          Description:
            'avrg. score: 11.2 ; function changing are:  W : 55 , R : 47 , E : 43 , L : 42 , Y : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '201',
          Color: '#8282FF',
          Description: 'avrg. score: -48.9'
        },
        {
          Name: 'Mutation score',
          Residue: '202',
          Color: '#FFF2F2',
          Description:
            'avrg. score: 5.4 ; function changing are:  D : 62 , E : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '203',
          Color: '#FFB1B1',
          Description:
            'avrg. score: 30.7 ; function changing are:  P : 62 , D : 61 , K : 60 , E : 57 , W : 56 , G : 55 , M : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '204',
          Color: '#FFE6E6',
          Description:
            'avrg. score: 10.0 ; function changing are:  W : 56 , P : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '205',
          Color: '#FF4F4F',
          Description:
            'avrg. score: 68.9 ; function changing are:  R : 88 , K : 87 , P : 86 , D : 83 , E : 82 , S : 80 , N : 79 , G : 79 , W : 79 , T : 78 , L : 77 , Q : 77 , M : 73 , A : 72 , H : 71 , I : 69 , V : 69 , C : 65 , F : 61 '
        },
        {
          Name: 'Mutation score',
          Residue: '206',
          Color: '#9E9EFF',
          Description: 'avrg. score: -38.0'
        },
        {
          Name: 'Mutation score',
          Residue: '207',
          Color: '#FFD7D7',
          Description:
            'avrg. score: 15.8 ; function changing are:  P : 62 , W : 52 , L : 46 , H : 43 , Y : 42 , K : 41 , R : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '208',
          Color: '#FF8F8F',
          Description:
            'avrg. score: 43.9 ; function changing are:  P : 80 , R : 70 , K : 66 , W : 62 , I : 62 , Y : 61 , F : 59 , L : 58 , Q : 56 , S : 55 , V : 49 , E : 46 , T : 45 , G : 43 , H : 42 , M : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '209',
          Color: '#CDCDFF',
          Description:
            'avrg. score: -19.7 ; function changing are:  W : 56 , F : 48 , Y : 46 '
        },
        {
          Name: 'Mutation score',
          Residue: '210',
          Color: '#FFFFFF',
          Description: 'avrg. score: 0.1 ; function changing are:  D : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '211',
          Color: '#FFB0B0',
          Description:
            'avrg. score: 31.1 ; function changing are:  P : 62 , R : 57 , K : 56 , W : 51 , F : 48 , Y : 47 , E : 47 , I : 45 , D : 44 , G : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '212',
          Color: '#AEAEFF',
          Description: 'avrg. score: -31.9 ; function changing are:  L : 65 '
        },
        {
          Name: 'Mutation score',
          Residue: '213',
          Color: '#FF4B4B',
          Description:
            'avrg. score: 70.4 ; function changing are:  D : 91 , P : 90 , E : 87 , G : 85 , W : 84 , N : 83 , F : 82 , L : 81 , T : 79 , I : 79 , Q : 78 , S : 78 , Y : 77 , K : 75 , V : 74 , A : 73 , C : 69 , M : 66 , H : 58 '
        },
        {
          Name: 'Mutation score',
          Residue: '214',
          Color: '#FFBCBC',
          Description:
            'avrg. score: 26.6 ; function changing are:  P : 64 , D : 59 , W : 55 , G : 49 , T : 47 , I : 43 , E : 43 , F : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '215',
          Color: '#FF9696',
          Description:
            'avrg. score: 41.4 ; function changing are:  W : 68 , P : 67 , D : 61 , R : 60 , Y : 56 , I : 54 , K : 54 , Q : 53 , G : 52 , H : 52 , E : 51 , L : 49 , V : 48 , M : 48 , F : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '216',
          Color: '#FF6868',
          Description:
            'avrg. score: 59.1 ; function changing are:  D : 83 , W : 82 , K : 82 , E : 80 , P : 80 , N : 77 , Q : 76 , F : 73 , R : 71 , G : 71 , Y : 68 , M : 66 , H : 63 , T : 62 , S : 61 , L : 59 , A : 46 , C : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '217',
          Color: '#FBFBFF',
          Description:
            'avrg. score: -1.6 ; function changing are:  W : 73 , D : 59 , P : 55 , E : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '218',
          Color: '#FF8F8F',
          Description:
            'avrg. score: 43.8 ; function changing are:  K : 80 , D : 80 , R : 77 , W : 75 , P : 74 , H : 73 , G : 72 , Q : 71 , E : 70 , N : 67 , S : 65 , M : 50 , Y : 46 , F : 43 , A : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '219',
          Color: '#FF6868',
          Description:
            'avrg. score: 59.1 ; function changing are:  D : 83 , W : 77 , E : 74 , N : 74 , Y : 73 , F : 73 , R : 72 , G : 71 , K : 71 , V : 68 , I : 67 , Q : 66 , H : 66 , L : 64 , T : 63 , C : 62 , S : 59 , A : 50 '
        },
        {
          Name: 'Mutation score',
          Residue: '220',
          Color: '#FF6868',
          Description:
            'avrg. score: 59.2 ; function changing are:  K : 85 , P : 84 , R : 82 , E : 80 , D : 79 , G : 76 , N : 72 , S : 69 , T : 67 , W : 66 , Q : 66 , A : 64 , I : 60 , H : 57 , V : 55 , C : 55 , M : 51 , L : 51 '
        },
        {
          Name: 'Mutation score',
          Residue: '221',
          Color: '#FFDBDB',
          Description:
            'avrg. score: 14.2 ; function changing are:  P : 64 , W : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '222',
          Color: '#5A5AFF',
          Description: 'avrg. score: -64.7'
        },
        {
          Name: 'Mutation score',
          Residue: '223',
          Color: '#FFD2D2',
          Description:
            'avrg. score: 17.9 ; function changing are:  D : 52 , R : 47 , E : 46 , W : 44 , G : 43 , K : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '224',
          Color: '#FFF9F9',
          Description: 'avrg. score: 2.4'
        },
        {
          Name: 'Mutation score',
          Residue: '225',
          Color: '#FCFCFF',
          Description: 'avrg. score: -1.4 ; function changing are:  D : 49 '
        },
        {
          Name: 'Mutation score',
          Residue: '226',
          Color: '#FF9090',
          Description:
            'avrg. score: 43.5 ; function changing are:  K : 69 , R : 66 , D : 64 , Y : 61 , P : 61 , I : 60 , L : 59 , N : 57 , E : 55 , M : 50 , F : 47 , V : 47 , H : 45 , C : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '227',
          Color: '#FFEEEE',
          Description:
            'avrg. score: 6.8 ; function changing are:  W : 43 , K : 41 , D : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '228',
          Color: '#FFE4E4',
          Description:
            'avrg. score: 10.6 ; function changing are:  P : 68 , R : 55 , Y : 52 , I : 49 , F : 46 , M : 45 , H : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '229',
          Color: '#FFCFCF',
          Description:
            'avrg. score: 18.8 ; function changing are:  D : 53 , K : 51 , P : 50 , G : 49 , Q : 44 , E : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '230',
          Color: '#FF9A9A',
          Description:
            'avrg. score: 39.7 ; function changing are:  P : 74 , D : 70 , K : 67 , W : 65 , R : 62 , E : 58 , L : 51 , G : 51 , Y : 50 , N : 48 , I : 48 , F : 47 , C : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '231',
          Color: '#FF7373',
          Description:
            'avrg. score: 55.0 ; function changing are:  R : 78 , D : 76 , P : 75 , E : 72 , W : 72 , Y : 70 , L : 69 , H : 68 , K : 68 , G : 67 , N : 64 , F : 64 , I : 58 , Q : 58 , M : 56 , V : 54 , C : 54 '
        },
        {
          Name: 'Mutation score',
          Residue: '232',
          Color: '#FF8D8D',
          Description:
            'avrg. score: 44.6 ; function changing are:  P : 78 , K : 77 , R : 75 , D : 73 , G : 72 , H : 69 , E : 68 , Q : 68 , N : 63 , T : 61 , S : 61 , A : 58 , W : 51 , Y : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '233',
          Color: '#FFFFFF',
          Description:
            'avrg. score: 0.1 ; function changing are:  K : 43 , D : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '234',
          Color: '#FF6666',
          Description:
            'avrg. score: 59.9 ; function changing are:  P : 87 , K : 86 , R : 83 , N : 78 , Q : 78 , E : 78 , D : 77 , S : 75 , T : 74 , G : 73 , W : 72 , C : 64 , M : 64 , H : 63 , A : 59 , V : 51 , I : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '235',
          Color: '#FFA2A2',
          Description:
            'avrg. score: 36.4 ; function changing are:  P : 75 , W : 74 , D : 67 , L : 65 , I : 64 , Y : 64 , F : 63 , V : 61 , G : 55 , R : 51 , M : 51 , C : 42 , E : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '236',
          Color: '#FF4646',
          Description:
            'avrg. score: 72.4 ; function changing are:  P : 93 , K : 91 , R : 90 , D : 88 , E : 88 , N : 87 , Q : 87 , T : 85 , G : 84 , S : 81 , M : 81 , H : 76 , A : 74 , V : 74 , W : 73 , I : 73 , C : 68 , L : 61 '
        },
        {
          Name: 'Mutation score',
          Residue: '237',
          Color: '#FF5E5E',
          Description:
            'avrg. score: 63.0 ; function changing are:  P : 89 , K : 87 , D : 87 , E : 87 , N : 84 , R : 82 , G : 81 , S : 80 , Q : 80 , W : 74 , T : 71 , H : 69 , A : 61 , C : 60 , Y : 57 , F : 55 , I : 51 , L : 46 , V : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '238',
          Color: '#FF3737',
          Description:
            'avrg. score: 78.4 ; function changing are:  P : 93 , K : 91 , R : 90 , D : 90 , W : 90 , N : 89 , E : 88 , H : 88 , Y : 87 , G : 86 , L : 86 , F : 86 , Q : 85 , I : 84 , M : 84 , T : 84 , S : 81 , V : 80 , A : 69 '
        },
        {
          Name: 'Mutation score',
          Residue: '239',
          Color: '#FF7D7D',
          Description:
            'avrg. score: 51.0 ; function changing are:  P : 80 , W : 77 , D : 70 , I : 68 , V : 68 , E : 66 , G : 66 , R : 65 , M : 63 , H : 62 , T : 57 , A : 54 , L : 54 , Y : 52 , K : 52 , F : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '240',
          Color: '#FF4545',
          Description:
            'avrg. score: 72.8 ; function changing are:  P : 91 , W : 90 , F : 86 , Y : 86 , L : 86 , K : 85 , I : 85 , V : 85 , E : 84 , D : 84 , H : 82 , R : 80 , Q : 80 , M : 80 , G : 74 , N : 73 , A : 70 , T : 63 , C : 62 '
        },
        {
          Name: 'Mutation score',
          Residue: '241',
          Color: '#FF4242',
          Description:
            'avrg. score: 73.9 ; function changing are:  F : 99 , P : 91 , W : 88 , D : 86 , G : 86 , K : 85 , V : 85 , Y : 84 , L : 84 , E : 84 , I : 83 , Q : 82 , R : 82 , H : 81 , M : 80 , N : 77 , A : 73 , T : 67 , C : 55 '
        },
        {
          Name: 'Mutation score',
          Residue: '242',
          Color: '#FF3737',
          Description:
            'avrg. score: 78.3 ; function changing are:  K : 92 , W : 91 , H : 91 , G : 91 , E : 90 , R : 90 , P : 90 , D : 90 , Y : 89 , N : 88 , Q : 88 , L : 86 , T : 85 , F : 85 , S : 85 , I : 83 , M : 82 , V : 77 , A : 74 '
        },
        {
          Name: 'Mutation score',
          Residue: '243',
          Color: '#FF7373',
          Description:
            'avrg. score: 54.9 ; function changing are:  D : 81 , E : 80 , K : 79 , H : 75 , R : 74 , Q : 72 , P : 71 , N : 70 , W : 67 , T : 64 , G : 63 , S : 58 , A : 56 , F : 55 , Y : 49 , I : 45 , L : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '244',
          Color: '#FF4747',
          Description:
            'avrg. score: 72.2 ; function changing are:  D : 99 , K : 88 , W : 87 , P : 87 , R : 86 , Y : 85 , E : 85 , F : 83 , H : 82 , L : 82 , Q : 81 , V : 79 , I : 79 , M : 79 , N : 76 , T : 69 , A : 68 , S : 58 , C : 46 '
        },
        {
          Name: 'Mutation score',
          Residue: '245',
          Color: '#FF3F3F',
          Description:
            'avrg. score: 75.3 ; function changing are:  S : 92 , P : 90 , W : 89 , D : 88 , R : 88 , Y : 88 , K : 87 , E : 85 , H : 85 , F : 85 , N : 83 , I : 83 , L : 83 , V : 81 , T : 78 , Q : 76 , C : 72 , A : 70 , M : 67 '
        },
        {
          Name: 'Mutation score',
          Residue: '246',
          Color: '#FF9393',
          Description:
            'avrg. score: 42.2 ; function changing are:  K : 71 , D : 68 , E : 66 , H : 65 , N : 64 , R : 59 , T : 58 , Q : 58 , S : 56 , W : 53 , P : 53 , G : 48 , Y : 46 , A : 44 , F : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '247',
          Color: '#FFA8A8',
          Description:
            'avrg. score: 34.0 ; function changing are:  W : 66 , P : 65 , D : 55 , Y : 54 , F : 53 , E : 51 , I : 51 , R : 47 , V : 46 , L : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '248',
          Color: '#FF4141',
          Description:
            'avrg. score: 74.5 ; function changing are:  W : 95 , Q : 93 , D : 93 , P : 91 , G : 87 , N : 85 , F : 84 , E : 83 , S : 83 , Y : 83 , T : 82 , H : 81 , I : 80 , V : 79 , L : 78 , M : 76 , A : 73 , C : 71 , K : 68 '
        },
        {
          Name: 'Mutation score',
          Residue: '249',
          Color: '#FF6F6F',
          Description:
            'avrg. score: 56.5 ; function changing are:  S : 94 , D : 88 , P : 84 , G : 77 , N : 75 , F : 74 , Y : 72 , L : 70 , I : 68 , V : 66 , H : 63 , W : 62 , M : 62 , E : 60 , T : 56 , Q : 56 , C : 52 , A : 50 '
        },
        {
          Name: 'Mutation score',
          Residue: '250',
          Color: '#FFA9A9',
          Description:
            'avrg. score: 33.8 ; function changing are:  W : 59 , R : 57 , Y : 55 , G : 54 , F : 53 , E : 53 , D : 50 , N : 49 , I : 45 , H : 45 , K : 44 , L : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '251',
          Color: '#FFABAB',
          Description:
            'avrg. score: 32.9 ; function changing are:  D : 70 , E : 67 , K : 65 , G : 63 , R : 62 , P : 61 , H : 59 , W : 57 , Q : 54 , Y : 49 , S : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '252',
          Color: '#FFB0B0',
          Description:
            'avrg. score: 31.1 ; function changing are:  P : 73 , D : 64 , W : 62 , G : 55 , K : 54 , Y : 51 , N : 50 , R : 50 , E : 48 , S : 44 , T : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '253',
          Color: '#FF7777',
          Description:
            'avrg. score: 53.1 ; function changing are:  P : 80 , R : 78 , K : 78 , E : 75 , D : 75 , W : 74 , Y : 70 , Q : 69 , H : 66 , G : 65 , N : 64 , F : 56 , C : 50 , M : 49 , L : 49 , S : 45 , A : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '254',
          Color: '#FF6D6D',
          Description:
            'avrg. score: 57.4 ; function changing are:  D : 84 , K : 84 , R : 83 , G : 81 , E : 81 , H : 81 , W : 81 , N : 80 , P : 79 , Q : 76 , S : 74 , F : 68 , Y : 67 , T : 59 , M : 56 , A : 55 '
        },
        {
          Name: 'Mutation score',
          Residue: '255',
          Color: '#FF9393',
          Description:
            'avrg. score: 42.5 ; function changing are:  P : 77 , K : 74 , D : 73 , R : 71 , E : 70 , G : 69 , N : 68 , H : 67 , Q : 64 , W : 63 , T : 60 , S : 51 , A : 48 , Y : 43 , M : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '256',
          Color: '#FF6E6E',
          Description:
            'avrg. score: 56.6 ; function changing are:  K : 82 , P : 81 , D : 76 , W : 75 , R : 75 , Y : 73 , L : 71 , E : 70 , G : 69 , V : 68 , H : 68 , I : 64 , Q : 62 , F : 61 , A : 54 , N : 54 , M : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '257',
          Color: '#FF5E5E',
          Description:
            'avrg. score: 63.1 ; function changing are:  D : 89 , P : 88 , K : 87 , N : 85 , G : 85 , E : 85 , R : 85 , H : 83 , S : 80 , W : 79 , T : 76 , Y : 75 , F : 67 , Q : 67 , A : 59 , C : 52 , I : 48 , V : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '258',
          Color: '#FF6C6C',
          Description:
            'avrg. score: 57.5 ; function changing are:  P : 87 , K : 79 , G : 77 , W : 73 , S : 71 , R : 70 , D : 69 , L : 69 , H : 69 , F : 68 , T : 68 , N : 67 , V : 66 , Y : 66 , M : 60 , I : 56 , A : 49 , Q : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '259',
          Color: '#F9F9FF',
          Description:
            'avrg. score: -2.4 ; function changing are:  W : 71 , F : 65 , P : 49 , M : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '260',
          Color: '#8282FF',
          Description: 'avrg. score: -49.1'
        },
        {
          Name: 'Mutation score',
          Residue: '261',
          Color: '#6A6AFF',
          Description: 'avrg. score: -58.4'
        },
        {
          Name: 'Mutation score',
          Residue: '262',
          Color: '#FF6B6B',
          Description:
            'avrg. score: 58.1 ; function changing are:  P : 82 , K : 81 , W : 76 , D : 75 , Y : 74 , R : 72 , H : 71 , I : 70 , L : 70 , F : 70 , V : 68 , E : 67 , M : 66 , T : 65 , N : 56 , S : 56 , A : 49 , Q : 46 '
        },
        {
          Name: 'Mutation score',
          Residue: '263',
          Color: '#C4C4FF',
          Description: 'avrg. score: -23.1 ; function changing are:  W : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '264',
          Color: '#FFC4C4',
          Description:
            'avrg. score: 23.1 ; function changing are:  D : 69 , G : 63 , N : 60 , H : 58 , E : 53 , K : 52 , W : 51 , Q : 51 , S : 51 , Y : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '265',
          Color: '#FF6F6F',
          Description:
            'avrg. score: 56.3 ; function changing are:  D : 84 , K : 82 , E : 81 , G : 80 , N : 79 , H : 78 , R : 78 , P : 76 , Q : 74 , S : 73 , T : 70 , A : 63 , W : 62 , Y : 60 , F : 54 , C : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '266',
          Color: '#FF5050',
          Description:
            'avrg. score: 68.7 ; function changing are:  W : 85 , K : 85 , D : 84 , R : 83 , E : 82 , P : 82 , H : 81 , N : 80 , L : 79 , F : 79 , M : 78 , I : 78 , V : 76 , Q : 76 , T : 73 , Y : 73 , C : 63 , S : 56 , A : 54 '
        },
        {
          Name: 'Mutation score',
          Residue: '267',
          Color: '#FF5555',
          Description:
            'avrg. score: 66.5 ; function changing are:  D : 92 , P : 90 , E : 87 , G : 86 , N : 85 , L : 85 , F : 85 , Y : 85 , I : 82 , M : 81 , S : 79 , V : 78 , W : 78 , A : 71 , Q : 68 , T : 52 , K : 45 , C : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '268',
          Color: '#CECEFF',
          Description: 'avrg. score: -19.2 ; function changing are:  W : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '269',
          Color: '#FFDADA',
          Description:
            'avrg. score: 14.6 ; function changing are:  W : 72 , F : 62 , M : 50 , Y : 49 , P : 48 , D : 43 , H : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '270',
          Color: '#FF8D8D',
          Description:
            'avrg. score: 44.5 ; function changing are:  D : 77 , P : 75 , K : 74 , E : 73 , R : 71 , G : 69 , N : 68 , H : 68 , Q : 63 , S : 63 , W : 55 , A : 54 , T : 49 , Y : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '271',
          Color: '#FF7A7A',
          Description:
            'avrg. score: 52.2 ; function changing are:  R : 77 , K : 74 , P : 74 , W : 69 , T : 67 , G : 66 , I : 64 , F : 63 , V : 62 , S : 61 , L : 60 , H : 59 , M : 58 , N : 54 , Q : 53 , Y : 51 , D : 48 , A : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '272',
          Color: '#FF6060',
          Description:
            'avrg. score: 62.5 ; function changing are:  P : 87 , D : 85 , K : 84 , W : 84 , R : 83 , E : 82 , H : 80 , N : 80 , Q : 79 , Y : 79 , S : 74 , L : 72 , G : 70 , F : 63 , T : 58 , M : 52 , C : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '273',
          Color: '#FF0909',
          Description:
            'avrg. score: 96.2 ; function changing are:  Y : 99 , T : 99 , W : 99 , P : 99 , G : 99 , S : 99 , K : 98 , Q : 98 , I : 98 , C : 98 , L : 98 , H : 97 , M : 97 , D : 96 , R : 94 , E : 94 , N : 93 , V : 91 , F : 89 , A : 88 '
        },
        {
          Name: 'Mutation score',
          Residue: '274',
          Color: '#FF6161',
          Description:
            'avrg. score: 61.9 ; function changing are:  P : 89 , W : 88 , K : 86 , D : 85 , R : 84 , E : 82 , H : 82 , Y : 81 , Q : 81 , F : 80 , N : 80 , G : 80 , L : 79 , M : 76 , T : 66 , S : 63 , A : 59 '
        },
        {
          Name: 'Mutation score',
          Residue: '275',
          Color: '#FF2A2A',
          Description:
            'avrg. score: 83.5 ; function changing are:  P : 96 , D : 95 , E : 94 , R : 94 , G : 94 , W : 94 , K : 94 , H : 93 , L : 93 , N : 93 , Q : 93 , F : 93 , Y : 93 , I : 92 , M : 91 , S : 90 , T : 90 , V : 89 , A : 75 '
        },
        {
          Name: 'Mutation score',
          Residue: '276',
          Color: '#FF9090',
          Description:
            'avrg. score: 43.7 ; function changing are:  D : 76 , W : 73 , E : 70 , F : 69 , Y : 68 , L : 63 , H : 62 , N : 60 , Q : 58 , G : 58 , I : 55 , V : 55 , K : 52 , M : 52 , R : 49 '
        },
        {
          Name: 'Mutation score',
          Residue: '277',
          Color: '#FF3838',
          Description:
            'avrg. score: 77.8 ; function changing are:  P : 94 , D : 93 , E : 92 , W : 92 , R : 91 , K : 91 , H : 90 , Q : 90 , F : 90 , Y : 88 , I : 87 , M : 86 , T : 86 , L : 84 , V : 84 , S : 83 , N : 77 , A : 75 , G : 73 '
        },
        {
          Name: 'Mutation score',
          Residue: '278',
          Color: '#FF8686',
          Description:
            'avrg. score: 47.5 ; function changing are:  D : 77 , E : 73 , G : 70 , W : 70 , R : 69 , N : 63 , F : 62 , L : 61 , V : 60 , Q : 55 , T : 55 , K : 54 , C : 53 , H : 52 , I : 48 , M : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '279',
          Color: '#FFDFDF',
          Description:
            'avrg. score: 12.6 ; function changing are:  D : 54 , P : 47 , E : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '280',
          Color: '#FF4949',
          Description:
            'avrg. score: 71.5 ; function changing are:  D : 91 , P : 89 , E : 88 , G : 86 , N : 84 , F : 83 , L : 83 , Y : 82 , T : 79 , H : 79 , S : 79 , I : 78 , V : 78 , M : 77 , Q : 77 , K : 76 , C : 73 , A : 69 , W : 67 '
        },
        {
          Name: 'Mutation score',
          Residue: '281',
          Color: '#FF7070',
          Description:
            'avrg. score: 56.0 ; function changing are:  R : 76 , K : 76 , W : 73 , L : 72 , I : 72 , Y : 71 , V : 70 , P : 69 , F : 68 , G : 67 , M : 66 , N : 63 , C : 57 , Q : 57 , A : 56 , S : 55 , T : 55 , H : 43 , E : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '282',
          Color: '#FFBFBF',
          Description:
            'avrg. score: 25.4 ; function changing are:  W : 93 , D : 70 , E : 60 , G : 56 , P : 55 , N : 47 , F : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '283',
          Color: '#FFE6E6',
          Description:
            'avrg. score: 10.1 ; function changing are:  D : 57 , E : 47 , P : 43 , W : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '284',
          Color: '#F7F7FF',
          Description: 'avrg. score: -3.3'
        },
        {
          Name: 'Mutation score',
          Residue: '285',
          Color: '#FFC6C6',
          Description:
            'avrg. score: 22.6 ; function changing are:  K : 88 , R : 44 , G : 44 , N : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '286',
          Color: '#FFBABA',
          Description:
            'avrg. score: 27.3 ; function changing are:  P : 63 , K : 48 , G : 46 '
        },
        {
          Name: 'Mutation score',
          Residue: '287',
          Color: '#B6B6FF',
          Description: 'avrg. score: -28.6'
        },
        {
          Name: 'Mutation score',
          Residue: '288',
          Color: '#BDBDFF',
          Description: 'avrg. score: -26.1'
        },
        {
          Name: 'Mutation score',
          Residue: '289',
          Color: '#7777FF',
          Description: 'avrg. score: -53.3'
        },
        {
          Name: 'Mutation score',
          Residue: '290',
          Color: '#FFA0A0',
          Description:
            'avrg. score: 37.4 ; function changing are:  W : 80 , G : 72 , E : 70 , P : 68 , C : 67 , S : 62 , T : 58 , M : 57 , I : 50 , L : 50 , K : 49 , Q : 49 '
        },
        {
          Name: 'Mutation score',
          Residue: '291',
          Color: '#FFCBCB',
          Description:
            'avrg. score: 20.5 ; function changing are:  D : 51 , W : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '292',
          Color: '#DCDCFF',
          Description: 'avrg. score: -13.8'
        },
        {
          Name: 'Mutation score',
          Residue: '293',
          Color: '#5E5EFF',
          Description: 'avrg. score: -63.1'
        },
        {
          Name: 'Mutation score',
          Residue: '294',
          Color: '#9E9EFF',
          Description: 'avrg. score: -38.1'
        },
        {
          Name: 'Mutation score',
          Residue: '295',
          Color: '#8484FF',
          Description: 'avrg. score: -48.4'
        },
        {
          Name: 'Mutation score',
          Residue: '296',
          Color: '#5C5CFF',
          Description: 'avrg. score: -63.9'
        },
        {
          Name: 'Mutation score',
          Residue: '297',
          Color: '#6464FF',
          Description: 'avrg. score: -60.6'
        },
        {
          Name: 'Mutation score',
          Residue: '298',
          Color: '#D8D8FF',
          Description:
            'avrg. score: -15.3 ; function changing are:  P : 54 , G : 51 , D : 45 '
        },
        {
          Name: 'Mutation score',
          Residue: '299',
          Color: '#7575FF',
          Description: 'avrg. score: -54.0'
        },
        {
          Name: 'Mutation score',
          Residue: '300',
          Color: '#9B9BFF',
          Description: 'avrg. score: -39.2'
        },
        {
          Name: 'Mutation score',
          Residue: '301',
          Color: '#AAAAFF',
          Description: 'avrg. score: -33.5'
        },
        {
          Name: 'Mutation score',
          Residue: '302',
          Color: '#8D8DFF',
          Description: 'avrg. score: -44.6'
        },
        {
          Name: 'Mutation score',
          Residue: '303',
          Color: '#B6B6FF',
          Description: 'avrg. score: -28.8'
        },
        {
          Name: 'Mutation score',
          Residue: '304',
          Color: '#A9A9FF',
          Description: 'avrg. score: -33.6'
        },
        {
          Name: 'Mutation score',
          Residue: '305',
          Color: '#FFD1D1',
          Description:
            'avrg. score: 18.3 ; function changing are:  D : 50 , W : 43 , G : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '306',
          Color: '#FFD0D0',
          Description:
            'avrg. score: 18.6 ; function changing are:  D : 61 , G : 52 , W : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '307',
          Color: '#6666FF',
          Description: 'avrg. score: -60.0'
        },
        {
          Name: 'Mutation score',
          Residue: '308',
          Color: '#D3D3FF',
          Description: 'avrg. score: -17.4'
        },
        {
          Name: 'Mutation score',
          Residue: '309',
          Color: '#AAAAFF',
          Description: 'avrg. score: -33.3'
        },
        {
          Name: 'Mutation score',
          Residue: '310',
          Color: '#8B8BFF',
          Description: 'avrg. score: -45.5'
        },
        {
          Name: 'Mutation score',
          Residue: '311',
          Color: '#B6B6FF',
          Description: 'avrg. score: -28.6'
        },
        {
          Name: 'Mutation score',
          Residue: '312',
          Color: '#FFDBDB',
          Description:
            'avrg. score: 14.2 ; function changing are:  R : 64 , C : 57 , N : 54 , I : 53 , M : 52 , P : 51 , K : 46 '
        },
        {
          Name: 'Mutation score',
          Residue: '313',
          Color: '#B2B2FF',
          Description: 'avrg. score: -30.2'
        },
        {
          Name: 'Mutation score',
          Residue: '314',
          Color: '#D5D5FF',
          Description: 'avrg. score: -16.6'
        },
        {
          Name: 'Mutation score',
          Residue: '315',
          Color: '#A3A3FF',
          Description: 'avrg. score: -36.0'
        },
        {
          Name: 'Mutation score',
          Residue: '316',
          Color: '#9F9FFF',
          Description: 'avrg. score: -37.7'
        },
        {
          Name: 'Mutation score',
          Residue: '317',
          Color: '#7272FF',
          Description: 'avrg. score: -55.4'
        },
        {
          Name: 'Mutation score',
          Residue: '318',
          Color: '#AFAFFF',
          Description: 'avrg. score: -31.4'
        },
        {
          Name: 'Mutation score',
          Residue: '319',
          Color: '#FFC9C9',
          Description:
            'avrg. score: 21.1 ; function changing are:  P : 46 , D : 46 , G : 45 , W : 44 , N : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '320',
          Color: '#FFFEFE',
          Description: 'avrg. score: 0.4'
        },
        {
          Name: 'Mutation score',
          Residue: '321',
          Color: '#FFDFDF',
          Description:
            'avrg. score: 12.8 ; function changing are:  G : 43 , P : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '322',
          Color: '#6363FF',
          Description: 'avrg. score: -61.1'
        },
        {
          Name: 'Mutation score',
          Residue: '323',
          Color: '#5454FF',
          Description: 'avrg. score: -66.8'
        },
        {
          Name: 'Mutation score',
          Residue: '324',
          Color: '#FFD9D9',
          Description: 'avrg. score: 14.9'
        },
        {
          Name: 'Mutation score',
          Residue: '325',
          Color: '#A1A1FF',
          Description: 'avrg. score: -36.8'
        },
        {
          Name: 'Mutation score',
          Residue: '326',
          Color: '#FF5555',
          Description:
            'avrg. score: 66.5 ; function changing are:  P : 89 , R : 83 , W : 82 , G : 82 , F : 76 , I : 76 , S : 75 , T : 74 , N : 74 , H : 74 , L : 74 , Q : 73 , M : 71 , V : 69 , Y : 64 , K : 63 , C : 62 , A : 59 , D : 50 '
        },
        {
          Name: 'Mutation score',
          Residue: '327',
          Color: '#FFE7E7',
          Description:
            'avrg. score: 9.7 ; function changing are:  P : 53 , K : 51 , R : 47 , D : 46 , G : 45 , E : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '328',
          Color: '#FF6B6B',
          Description:
            'avrg. score: 58.1 ; function changing are:  P : 84 , D : 83 , K : 81 , R : 80 , E : 79 , G : 79 , N : 79 , T : 73 , H : 73 , Q : 73 , W : 70 , A : 66 , M : 64 , L : 64 , V : 59 , S : 54 '
        },
        {
          Name: 'Mutation score',
          Residue: '329',
          Color: '#D9D9FF',
          Description: 'avrg. score: -14.9'
        },
        {
          Name: 'Mutation score',
          Residue: '330',
          Color: '#FF6E6E',
          Description:
            'avrg. score: 56.8 ; function changing are:  P : 86 , D : 85 , K : 84 , R : 82 , E : 81 , G : 80 , N : 80 , H : 80 , S : 75 , Y : 75 , Q : 69 , T : 69 , W : 64 , A : 59 , C : 52 , F : 47 '
        },
        {
          Name: 'Mutation score',
          Residue: '331',
          Color: '#E9E9FF',
          Description: 'avrg. score: -8.9 ; function changing are:  W : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '332',
          Color: '#FF6D6D',
          Description:
            'avrg. score: 57.1 ; function changing are:  P : 84 , D : 83 , K : 82 , E : 81 , G : 80 , R : 80 , N : 79 , H : 76 , W : 76 , Q : 74 , S : 73 , Y : 71 , T : 66 , F : 65 , L : 61 , A : 58 , M : 57 , C : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '333',
          Color: '#FF8080',
          Description:
            'avrg. score: 50.0 ; function changing are:  D : 90 , P : 84 , G : 83 , E : 82 , N : 81 , W : 77 , S : 74 , F : 71 , L : 71 , M : 65 , A : 63 , I : 57 , C : 56 , T : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '334',
          Color: '#FF4E4E',
          Description:
            'avrg. score: 69.3 ; function changing are:  W : 86 , P : 86 , Y : 85 , D : 85 , E : 85 , R : 84 , K : 82 , H : 82 , Q : 80 , L : 79 , F : 78 , M : 77 , I : 76 , V : 74 , T : 72 , N : 70 , S : 64 , A : 62 , C : 55 '
        },
        {
          Name: 'Mutation score',
          Residue: '335',
          Color: '#FF6868',
          Description:
            'avrg. score: 59.3 ; function changing are:  D : 90 , P : 86 , W : 84 , E : 82 , N : 81 , Y : 79 , G : 77 , V : 76 , I : 76 , L : 74 , M : 74 , F : 73 , S : 73 , T : 71 , A : 66 , C : 65 , Q : 59 '
        },
        {
          Name: 'Mutation score',
          Residue: '336',
          Color: '#FFE6E6',
          Description:
            'avrg. score: 10.1 ; function changing are:  P : 67 , W : 45 , L : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '337',
          Color: '#FF9595',
          Description:
            'avrg. score: 41.8 ; function changing are:  D : 84 , P : 82 , W : 81 , F : 76 , G : 74 , Y : 74 , L : 72 , V : 68 , M : 66 , S : 61 , E : 61 , I : 60 , A : 60 , T : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '338',
          Color: '#FF8888',
          Description:
            'avrg. score: 46.5 ; function changing are:  K : 78 , P : 78 , D : 76 , R : 75 , E : 72 , N : 70 , G : 69 , Q : 66 , T : 65 , H : 65 , S : 64 , I : 55 , L : 55 , A : 54 , V : 54 , M : 49 '
        },
        {
          Name: 'Mutation score',
          Residue: '339',
          Color: '#FFC8C8',
          Description:
            'avrg. score: 21.8 ; function changing are:  P : 71 , R : 45 , F : 42 , W : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '340',
          Color: '#FFE6E6',
          Description:
            'avrg. score: 9.9 ; function changing are:  D : 55 , R : 54 , P : 53 , E : 51 , N : 48 , H : 47 , K : 45 , G : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '341',
          Color: '#FFC0C0',
          Description:
            'avrg. score: 24.9 ; function changing are:  D : 69 , K : 62 , E : 59 , N : 58 , P : 57 , G : 55 , H : 55 , W : 52 , R : 48 , Q : 48 , T : 46 , Y : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '342',
          Color: '#EAEAFF',
          Description: 'avrg. score: -8.3 ; function changing are:  D : 48 '
        },
        {
          Name: 'Mutation score',
          Residue: '343',
          Color: '#FFFFFF',
          Description: 'avrg. score: 0.3 ; function changing are:  P : 59 '
        },
        {
          Name: 'Mutation score',
          Residue: '344',
          Color: '#FF9898',
          Description:
            'avrg. score: 40.6 ; function changing are:  P : 79 , D : 79 , K : 74 , G : 74 , E : 72 , N : 72 , H : 72 , R : 66 , Q : 66 , W : 64 , T : 60 , S : 58 , A : 52 '
        },
        {
          Name: 'Mutation score',
          Residue: '345',
          Color: '#FFE8E8',
          Description:
            'avrg. score: 9.1 ; function changing are:  P : 49 , W : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '346',
          Color: '#FFD6D6',
          Description:
            'avrg. score: 16.2 ; function changing are:  P : 66 , R : 52 , W : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '347',
          Color: '#FFB6B6',
          Description:
            'avrg. score: 28.8 ; function changing are:  P : 68 , K : 62 , W : 61 , R : 60 , E : 57 , Y : 56 , D : 55 , H : 54 , F : 53 , Q : 47 , L : 46 , T : 43 , N : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '348',
          Color: '#FF7171',
          Description:
            'avrg. score: 55.6 ; function changing are:  P : 80 , G : 77 , D : 74 , H : 74 , E : 73 , K : 73 , R : 71 , S : 70 , N : 69 , T : 69 , W : 67 , Q : 62 , A : 61 , Y : 57 , C : 53 , V : 47 , I : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '349',
          Color: '#FFAFAF',
          Description:
            'avrg. score: 31.3 ; function changing are:  P : 71 , R : 63 , K : 54 , G : 53 , W : 50 , S : 46 , T : 45 , H : 43 , F : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '350',
          Color: '#FFC0C0',
          Description:
            'avrg. score: 24.8 ; function changing are:  R : 61 , P : 59 , K : 53 , E : 52 , H : 51 , D : 50 , N : 47 , Q : 46 , G : 46 , W : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '351',
          Color: '#D9D9FF',
          Description: 'avrg. score: -15.0'
        },
        {
          Name: 'Mutation score',
          Residue: '352',
          Color: '#F7F7FF',
          Description: 'avrg. score: -3.3'
        },
        {
          Name: 'Mutation score',
          Residue: '353',
          Color: '#5757FF',
          Description: 'avrg. score: -66.0'
        },
        {
          Name: 'Mutation score',
          Residue: '354',
          Color: '#7C7CFF',
          Description: 'avrg. score: -51.3'
        },
        {
          Name: 'Mutation score',
          Residue: '355',
          Color: '#7272FF',
          Description: 'avrg. score: -55.4'
        },
        {
          Name: 'Mutation score',
          Residue: '356',
          Color: '#4B4BFF',
          Description: 'avrg. score: -70.6'
        },
        {
          Name: 'Mutation score',
          Residue: '357',
          Color: '#C2C2FF',
          Description: 'avrg. score: -24.2'
        },
        {
          Name: 'Mutation score',
          Residue: '358',
          Color: '#E6E6FF',
          Description: 'avrg. score: -10.1'
        },
        {
          Name: 'Mutation score',
          Residue: '359',
          Color: '#C6C6FF',
          Description: 'avrg. score: -22.6'
        },
        {
          Name: 'Mutation score',
          Residue: '360',
          Color: '#E6E6FF',
          Description:
            'avrg. score: -9.8 ; function changing are:  D : 55 , W : 47 , N : 46 '
        },
        {
          Name: 'Mutation score',
          Residue: '361',
          Color: '#A6A6FF',
          Description: 'avrg. score: -34.9'
        },
        {
          Name: 'Mutation score',
          Residue: '362',
          Color: '#9B9BFF',
          Description: 'avrg. score: -39.5'
        },
        {
          Name: 'Mutation score',
          Residue: '363',
          Color: '#FFDBDB',
          Description:
            'avrg. score: 14.4 ; function changing are:  D : 58 , P : 50 , W : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '364',
          Color: '#5757FF',
          Description: 'avrg. score: -65.8'
        },
        {
          Name: 'Mutation score',
          Residue: '365',
          Color: '#CCCCFF',
          Description: 'avrg. score: -20.2'
        },
        {
          Name: 'Mutation score',
          Residue: '366',
          Color: '#6A6AFF',
          Description: 'avrg. score: -58.2'
        },
        {
          Name: 'Mutation score',
          Residue: '367',
          Color: '#4848FF',
          Description: 'avrg. score: -71.7'
        },
        {
          Name: 'Mutation score',
          Residue: '368',
          Color: '#7373FF',
          Description: 'avrg. score: -54.8'
        },
        {
          Name: 'Mutation score',
          Residue: '369',
          Color: '#8181FF',
          Description: 'avrg. score: -49.3'
        },
        {
          Name: 'Mutation score',
          Residue: '370',
          Color: '#9999FF',
          Description: 'avrg. score: -39.9'
        },
        {
          Name: 'Mutation score',
          Residue: '371',
          Color: '#7878FF',
          Description: 'avrg. score: -52.9'
        },
        {
          Name: 'Mutation score',
          Residue: '372',
          Color: '#F6F6FF',
          Description: 'avrg. score: -3.9'
        },
        {
          Name: 'Mutation score',
          Residue: '373',
          Color: '#E8E8FF',
          Description: 'avrg. score: -9.1'
        },
        {
          Name: 'Mutation score',
          Residue: '374',
          Color: '#8A8AFF',
          Description: 'avrg. score: -46.0'
        },
        {
          Name: 'Mutation score',
          Residue: '375',
          Color: '#8B8BFF',
          Description: 'avrg. score: -45.6'
        },
        {
          Name: 'Mutation score',
          Residue: '376',
          Color: '#9595FF',
          Description: 'avrg. score: -41.7'
        },
        {
          Name: 'Mutation score',
          Residue: '377',
          Color: '#FFE5E5',
          Description:
            'avrg. score: 10.4 ; function changing are:  D : 49 , E : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '378',
          Color: '#D1D1FF',
          Description: 'avrg. score: -18.1'
        },
        {
          Name: 'Mutation score',
          Residue: '379',
          Color: '#A3A3FF',
          Description: 'avrg. score: -36.1'
        },
        {
          Name: 'Mutation score',
          Residue: '380',
          Color: '#FFCACA',
          Description:
            'avrg. score: 20.9 ; function changing are:  E : 52 , D : 44 , W : 43 , P : 43 '
        },
        {
          Name: 'Mutation score',
          Residue: '381',
          Color: '#FF9B9B',
          Description:
            'avrg. score: 39.5 ; function changing are:  D : 73 , P : 66 , G : 57 , W : 55 , N : 53 , T : 52 , Y : 50 , E : 50 , L : 46 , S : 46 , F : 44 , Q : 44 , V : 44 , H : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '382',
          Color: '#FFA1A1',
          Description:
            'avrg. score: 36.8 ; function changing are:  D : 71 , E : 64 , G : 61 , P : 60 , W : 55 , F : 50 , Y : 49 , T : 48 , N : 45 , Q : 44 , V : 42 , I : 42 , S : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '383',
          Color: '#FF9E9E',
          Description:
            'avrg. score: 38.1 ; function changing are:  D : 68 , G : 66 , E : 66 , N : 61 , A : 58 , W : 54 , S : 51 , H : 50 , Q : 50 , Y : 48 , C : 47 , T : 44 '
        },
        {
          Name: 'Mutation score',
          Residue: '384',
          Color: '#FFEBEB',
          Description:
            'avrg. score: 8.1 ; function changing are:  D : 55 , G : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '385',
          Color: '#D5D5FF',
          Description: 'avrg. score: -16.8'
        },
        {
          Name: 'Mutation score',
          Residue: '386',
          Color: '#FFA4A4',
          Description:
            'avrg. score: 35.9 ; function changing are:  D : 69 , G : 59 , N : 58 , E : 58 , P : 55 , W : 52 , S : 52 , T : 49 , Y : 46 , A : 42 , L : 42 '
        },
        {
          Name: 'Mutation score',
          Residue: '387',
          Color: '#7373FF',
          Description: 'avrg. score: -54.7'
        },
        {
          Name: 'Mutation score',
          Residue: '388',
          Color: '#FFC6C6',
          Description:
            'avrg. score: 22.4 ; function changing are:  P : 57 , N : 41 '
        },
        {
          Name: 'Mutation score',
          Residue: '389',
          Color: '#7B7BFF',
          Description: 'avrg. score: -51.9'
        },
        {
          Name: 'Mutation score',
          Residue: '390',
          Color: '#D6D6FF',
          Description: 'avrg. score: -16.4'
        },
        {
          Name: 'Mutation score',
          Residue: '391',
          Color: '#FFE5E5',
          Description: 'avrg. score: 10.4'
        },
        {
          Name: 'Mutation score',
          Residue: '392',
          Color: '#FFE2E2',
          Description: 'avrg. score: 11.7'
        },
        {
          Name: 'Mutation score',
          Residue: '393',
          Color: '#FFD4D4',
          Description:
            'avrg. score: 16.9 ; function changing are:  P : 44 , K : 43 , W : 42 , L : 41 '
        }
      ]
    }
  }
})
