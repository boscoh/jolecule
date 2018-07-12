

define(function() {

var result = {
  get_protein_data: function(loadProteinData) {
    loadProteinData({
      pdb_id: "1a0a.Ar",
      pdb_text: getPdbLines(),
    });
  },
  get_views: function(loadViewDicts) {
    loadViewDicts(getViewDicts());
  },
  save_views: function(views, success) { success() },
  delete_protein_view: function(viewId, success) { success() }, };
  
function getPdbLines() {
    return pdbLines.join('\n');
}  

function getViewDicts() {
    return views;
}  

var views = {};

var pdbLines = [
    "HETATM    0 Ar   XXX     0      19.532  28.285  29.094  1.00  1.01          Ar", 
    "HETATM    1 Ar   XXX     1      19.907  28.285  29.094  1.00  1.02          Ar", 
    "HETATM    2 Ar   XXX     2      19.157  28.660  29.094  1.00  1.02          Ar", 
    "HETATM    3 Ar   XXX     3      19.532  28.660  29.094  1.00  1.02          Ar", 
    "HETATM    4 Ar   XXX     4      19.907  27.910  29.469  1.00  1.01          Ar", 
    "HETATM    5 Ar   XXX     5      20.282  27.910  29.469  1.00  1.02          Ar", 
    "HETATM    6 Ar   XXX     6      20.657  27.910  29.469  1.00  1.00          Ar", 
    "HETATM    7 Ar   XXX     7      19.157  28.285  29.469  1.00  1.01          Ar", 
    "HETATM    8 Ar   XXX     8      19.532  28.285  29.469  1.00  1.04          Ar", 
    "HETATM    9 Ar   XXX     9      19.907  28.285  29.469  1.00  1.05          Ar", 
    "HETATM   10 Ar   XXX    10      20.282  28.285  29.469  1.00  1.02          Ar", 
    "HETATM   11 Ar   XXX    11      18.782  28.660  29.469  1.00  1.02          Ar", 
    "HETATM   12 Ar   XXX    12      19.157  28.660  29.469  1.00  1.06          Ar", 
    "HETATM   13 Ar   XXX    13      19.532  28.660  29.469  1.00  1.06          Ar", 
    "HETATM   14 Ar   XXX    14      19.907  28.660  29.469  1.00  1.03          Ar", 
    "HETATM   15 Ar   XXX    15      19.157  29.035  29.469  1.00  1.01          Ar", 
    "HETATM   16 Ar   XXX    16      19.157  28.285  29.844  1.00  1.01          Ar", 
    "HETATM   17 Ar   XXX    17      19.532  28.285  29.844  1.00  1.03          Ar", 
    "HETATM   18 Ar   XXX    18      19.907  28.285  29.844  1.00  1.05          Ar", 
    "HETATM   19 Ar   XXX    19      20.282  28.285  29.844  1.00  1.04          Ar", 
    "HETATM   20 Ar   XXX    20      20.657  28.285  29.844  1.00  1.03          Ar", 
    "HETATM   21 Ar   XXX    21      18.782  28.660  29.844  1.00  1.01          Ar", 
    "HETATM   22 Ar   XXX    22      19.157  28.660  29.844  1.00  1.05          Ar", 
    "HETATM   23 Ar   XXX    23      19.532  28.660  29.844  1.00  1.06          Ar", 
    "HETATM   24 Ar   XXX    24      19.907  28.660  29.844  1.00  1.07          Ar", 
    "HETATM   25 Ar   XXX    25      20.282  28.660  29.844  1.00  1.04          Ar", 
    "HETATM   26 Ar   XXX    26      19.157  29.035  29.844  1.00  1.05          Ar", 
    "HETATM   27 Ar   XXX    27      19.532  29.035  29.844  1.00  1.05          Ar", 
    "HETATM   28 Ar   XXX    28      19.907  29.035  29.844  1.00  1.01          Ar", 
    "HETATM   29 Ar   XXX    29      19.532  28.285  30.219  1.00  1.02          Ar", 
    "HETATM   30 Ar   XXX    30      19.907  28.285  30.219  1.00  1.03          Ar", 
    "HETATM   31 Ar   XXX    31      20.282  28.285  30.219  1.00  1.03          Ar", 
    "HETATM   32 Ar   XXX    32      20.657  28.285  30.219  1.00  1.02          Ar", 
    "HETATM   33 Ar   XXX    33      19.157  28.660  30.219  1.00  1.04          Ar", 
    "HETATM   34 Ar   XXX    34      19.532  28.660  30.219  1.00  1.06          Ar", 
    "HETATM   35 Ar   XXX    35      19.907  28.660  30.219  1.00  1.06          Ar", 
    "HETATM   36 Ar   XXX    36      20.282  28.660  30.219  1.00  1.05          Ar", 
    "HETATM   37 Ar   XXX    37      20.657  28.660  30.219  1.00  1.03          Ar", 
    "HETATM   38 Ar   XXX    38      19.157  29.035  30.219  1.00  1.06          Ar", 
    "HETATM   39 Ar   XXX    39      19.532  29.035  30.219  1.00  1.07          Ar", 
    "HETATM   40 Ar   XXX    40      19.907  29.035  30.219  1.00  1.06          Ar", 
    "HETATM   41 Ar   XXX    41      20.282  29.035  30.219  1.00  1.03          Ar", 
    "HETATM   42 Ar   XXX    42      19.157  29.410  30.219  1.00  1.00          Ar", 
    "HETATM   43 Ar   XXX    43      19.532  29.410  30.219  1.00  1.01          Ar", 
    "HETATM   44 Ar   XXX    44      19.532  28.285  30.594  1.00  1.01          Ar", 
    "HETATM   45 Ar   XXX    45      19.907  28.285  30.594  1.00  1.01          Ar", 
    "HETATM   46 Ar   XXX    46      19.157  28.660  30.594  1.00  1.03          Ar", 
    "HETATM   47 Ar   XXX    47      19.532  28.660  30.594  1.00  1.04          Ar", 
    "HETATM   48 Ar   XXX    48      19.907  28.660  30.594  1.00  1.05          Ar", 
    "HETATM   49 Ar   XXX    49      20.282  28.660  30.594  1.00  1.04          Ar", 
    "HETATM   50 Ar   XXX    50      19.157  29.035  30.594  1.00  1.03          Ar", 
    "HETATM   51 Ar   XXX    51      19.532  29.035  30.594  1.00  1.04          Ar", 
    "HETATM   52 Ar   XXX    52      19.907  29.035  30.594  1.00  1.03          Ar", 
    "HETATM   53 Ar   XXX    53      20.282  29.035  30.594  1.00  1.03          Ar", 
    "HETATM   54 Ar   XXX    54      20.657  29.035  30.594  1.00  1.00          Ar", 
    "HETATM   55 Ar   XXX    55      19.157  33.910  38.469  1.00  1.01          Ar", 
    "HETATM   56 Ar   XXX    56      -3.718  -6.590  64.719  1.00   NaN          Ar", 
    "", 
];

return result;
    
});

