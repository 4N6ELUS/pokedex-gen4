// ================================================
// POKEDEX APP - Single file, no ES modules
// ================================================

(function () {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================

  const GENERATION_RANGES = [
    { id: 1, name: 'generation-i', label: 'Gen I (Kanto)', start: 1, end: 151 },
    { id: 2, name: 'generation-ii', label: 'Gen II (Johto)', start: 152, end: 251 },
    { id: 3, name: 'generation-iii', label: 'Gen III (Hoenn)', start: 252, end: 386 },
    { id: 4, name: 'generation-iv', label: 'Gen IV (Sinnoh)', start: 387, end: 493 },
    { id: 5, name: 'generation-v', label: 'Gen V (Unova)', start: 494, end: 649 },
    { id: 6, name: 'generation-vi', label: 'Gen VI (Kalos)', start: 650, end: 721 },
    { id: 7, name: 'generation-vii', label: 'Gen VII (Alola)', start: 722, end: 809 },
    { id: 8, name: 'generation-viii', label: 'Gen VIII (Galar)', start: 810, end: 905 },
    { id: 9, name: 'generation-ix', label: 'Gen IX (Paldea)', start: 906, end: 1025 },
  ];

  const POKEMON_TYPES = [
    'normal', 'fire', 'water', 'grass', 'electric', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
    'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
  ];

  const TOTAL_POKEMON = 1025;
  const API_BASE = 'https://pokeapi.co/api/v2';
  const BATCH_SIZE = 40;
  const BATCH_DELAY_MS = 100;

  const SHOWDOWN_NAME_MAP = {
    'deoxys-normal': 'deoxys',
    'wormadam-plant': 'wormadam',
    'giratina-altered': 'giratina',
    'shaymin-land': 'shaymin',
    'basculin-red-striped': 'basculin',
    'darmanitan-standard': 'darmanitan',
    'tornadus-incarnate': 'tornadus',
    'thundurus-incarnate': 'thundurus',
    'landorus-incarnate': 'landorus',
    'keldeo-ordinary': 'keldeo',
    'meloetta-aria': 'meloetta',
    'meowstic-male': 'meowstic',
    'aegislash-shield': 'aegislash',
    'pumpkaboo-average': 'pumpkaboo',
    'gourgeist-average': 'gourgeist',
    'zygarde-50': 'zygarde',
    'oricorio-baile': 'oricorio',
    'lycanroc-midday': 'lycanroc',
    'wishiwashi-solo': 'wishiwashi',
    'minior-red-meteor': 'minior',
    'mimikyu-disguised': 'mimikyu',
    'toxtricity-amped': 'toxtricity',
    'eiscue-ice': 'eiscue',
    'indeedee-male': 'indeedee',
    'morpeko-full-belly': 'morpeko',
    'urshifu-single-strike': 'urshifu',
    'basculegion-male': 'basculegion',
    'enamorus-incarnate': 'enamorus',
    'oinkologne-male': 'oinkologne',
    'dudunsparce-two-segment': 'dudunsparce',
    'palafin-zero': 'palafin',
    'tatsugiri-curly': 'tatsugiri',
    'squawkabilly-green-plumage': 'squawkabilly',
    'maushold-family-of-four': 'maushold',
    'ogerpon-teal-mask': 'ogerpon',
    'gimmighoul-chest': 'gimmighoul',
  };

  function getAnimatedSpriteUrl(id, name) {
    if (id <= 649) {
      return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/' + id + '.gif';
    }
    var showdownName = SHOWDOWN_NAME_MAP[name] || name;
    return 'https://play.pokemonshowdown.com/sprites/ani/' + showdownName + '.gif';
  }

  function getStaticSpriteUrl(id) {
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + id + '.png';
  }

  function getGenerationForId(id) {
    for (var i = 0; i < GENERATION_RANGES.length; i++) {
      var gen = GENERATION_RANGES[i];
      if (id >= gen.start && id <= gen.end) return gen;
    }
    return null;
  }

  function formatName(name) {
    return name.split('-').map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  }

  // ============================================
  // STATE
  // ============================================

  var state = {
    allPokemon: [],
    filteredPokemon: [],
    filters: {
      searchText: '',
      dexNumber: null,
      type: '',
      generation: '',
    },
    selectedPokemonId: null,
  };

  // ============================================
  // CACHE
  // ============================================

  var cache = {
    pokemonDetails: {},
    speciesDetails: {},
    evolutionChains: {},
  };

  function getCachedTypes(id) {
    return cache.pokemonDetails[id] ? cache.pokemonDetails[id].types : null;
  }

  // ============================================
  // API
  // ============================================

  function fetchPokemonList() {
    var cached = sessionStorage.getItem('pokedex_list');
    if (cached) {
      return Promise.resolve(JSON.parse(cached));
    }

    return fetch(API_BASE + '/pokemon?limit=' + TOTAL_POKEMON + '&offset=0')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = data.results.map(function (entry, index) {
          return { id: index + 1, name: entry.name };
        });
        sessionStorage.setItem('pokedex_list', JSON.stringify(list));
        return list;
      });
  }

  function fetchAllPokemonDetails(onProgress) {
    // Cargar desde sessionStorage
    var cachedDetails = sessionStorage.getItem('pokedex_details');
    if (cachedDetails) {
      try {
        var parsed = JSON.parse(cachedDetails);
        // Validar que el cache tiene el formato nuevo (con stats)
        var sampleKey = Object.keys(parsed)[0];
        if (sampleKey && parsed[sampleKey].stats) {
          cache.pokemonDetails = parsed;
          if (Object.keys(cache.pokemonDetails).length >= TOTAL_POKEMON) {
            onProgress(TOTAL_POKEMON, TOTAL_POKEMON);
            return Promise.resolve(cache.pokemonDetails);
          }
        } else {
          // Cache viejo sin stats, descartar
          sessionStorage.removeItem('pokedex_details');
          cache.pokemonDetails = {};
        }
      } catch (e) {
        cache.pokemonDetails = {};
      }
    }

    var missingIds = [];
    for (var id = 1; id <= TOTAL_POKEMON; id++) {
      if (!cache.pokemonDetails[id]) missingIds.push(id);
    }

    var completed = TOTAL_POKEMON - missingIds.length;
    onProgress(completed, TOTAL_POKEMON);

    function processBatch(batchIndex) {
      if (batchIndex >= missingIds.length) {
        // Guardar todo al final
        try {
          sessionStorage.setItem('pokedex_details', JSON.stringify(cache.pokemonDetails));
        } catch (e) { /* sessionStorage lleno */ }
        return Promise.resolve(cache.pokemonDetails);
      }

      var batch = missingIds.slice(batchIndex, batchIndex + BATCH_SIZE);
      var promises = batch.map(function (pid) {
        return fetch(API_BASE + '/pokemon/' + pid)
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function (data) {
            cache.pokemonDetails[pid] = {
              types: data.types.map(function (t) { return t.type.name; }),
              stats: data.stats.map(function (s) {
                return { name: s.stat.name, value: s.base_stat };
              }),
              height: data.height,
              weight: data.weight,
              abilities: data.abilities.map(function (a) {
                return { name: a.ability.name, isHidden: a.is_hidden };
              }),
            };
          })
          .catch(function () {
            cache.pokemonDetails[pid] = { types: [], stats: [], height: 0, weight: 0, abilities: [] };
          });
      });

      return Promise.all(promises).then(function () {
        completed += batch.length;
        onProgress(Math.min(completed, TOTAL_POKEMON), TOTAL_POKEMON);

        // Guardar periodicamente
        if (batchIndex % (BATCH_SIZE * 5) === 0) {
          try {
            sessionStorage.setItem('pokedex_details', JSON.stringify(cache.pokemonDetails));
          } catch (e) { /* */ }
        }

        // Pausa entre lotes
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(processBatch(batchIndex + BATCH_SIZE));
          }, BATCH_DELAY_MS);
        });
      });
    }

    return processBatch(0);
  }

  function fetchSpeciesDetail(id) {
    if (cache.speciesDetails[id]) return Promise.resolve(cache.speciesDetails[id]);

    return fetch(API_BASE + '/pokemon-species/' + id)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var flavorEs = data.flavor_text_entries.filter(function (e) { return e.language.name === 'es'; });
        var flavorEn = data.flavor_text_entries.filter(function (e) { return e.language.name === 'en'; });
        var flavorEntries = flavorEs.length > 0 ? flavorEs : flavorEn;
        var flavorText = flavorEntries.length > 0
          ? flavorEntries[flavorEntries.length - 1].flavor_text.replace(/[\f\n\r]/g, ' ').replace(/\s+/g, ' ').trim()
          : 'Sin descripcion disponible.';

        var genusEs = data.genera.find(function (g) { return g.language.name === 'es'; });
        var genusEn = data.genera.find(function (g) { return g.language.name === 'en'; });
        var genus = (genusEs || genusEn || {}).genus || '';

        var evoUrl = data.evolution_chain ? data.evolution_chain.url : null;
        var chainId = evoUrl ? parseInt(evoUrl.split('/').filter(Boolean).pop()) : null;

        cache.speciesDetails[id] = {
          flavorText: flavorText,
          generationName: data.generation.name,
          evolutionChainId: chainId,
          genus: genus,
        };

        return cache.speciesDetails[id];
      });
  }

  function fetchEvolutionChain(chainId) {
    if (!chainId) return Promise.resolve([]);
    if (cache.evolutionChains[chainId]) return Promise.resolve(cache.evolutionChains[chainId]);

    return fetch(API_BASE + '/evolution-chain/' + chainId)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var chain = parseEvolutionChain(data.chain);
        cache.evolutionChains[chainId] = chain;
        return chain;
      });
  }

  function parseEvolutionChain(node) {
    var stages = [];

    function traverse(current, depth) {
      if (!stages[depth]) stages[depth] = [];

      var speciesUrl = current.species.url;
      var speciesId = parseInt(speciesUrl.split('/').filter(Boolean).pop());

      var methods = current.evolution_details.map(function (detail) {
        return formatEvolutionMethod(detail);
      });

      stages[depth].push({
        name: current.species.name,
        id: speciesId,
        methods: methods.length > 0 ? methods : (depth === 0 ? ['Base'] : ['Desconocido']),
      });

      for (var i = 0; i < current.evolves_to.length; i++) {
        traverse(current.evolves_to[i], depth + 1);
      }
    }

    traverse(node, 0);
    return stages;
  }

  function formatEvolutionMethod(detail) {
    var trigger = detail.trigger ? detail.trigger.name : null;
    var parts = [];

    if (trigger === 'level-up') {
      if (detail.min_level) parts.push('Nivel ' + detail.min_level);
      if (detail.min_happiness) parts.push('Felicidad ' + detail.min_happiness);
      if (detail.min_affection) parts.push('Afecto ' + detail.min_affection);
      if (detail.min_beauty) parts.push('Belleza ' + detail.min_beauty);
      if (detail.time_of_day) {
        var timeMap = { day: 'dia', night: 'noche', dusk: 'atardecer' };
        parts.push('(' + (timeMap[detail.time_of_day] || detail.time_of_day) + ')');
      }
      if (detail.known_move) parts.push('sabe ' + detail.known_move.name.replace(/-/g, ' '));
      if (detail.known_move_type) parts.push('sabe mov. tipo ' + detail.known_move_type.name);
      if (detail.location) parts.push('en ' + detail.location.name.replace(/-/g, ' '));
      if (detail.held_item) parts.push('con ' + detail.held_item.name.replace(/-/g, ' '));
      if (detail.needs_overworld_rain) parts.push('con lluvia');
      if (detail.turn_upside_down) parts.push('consola al reves');
      if (detail.relative_physical_stats === 1) parts.push('Ataque > Defensa');
      if (detail.relative_physical_stats === -1) parts.push('Defensa > Ataque');
      if (detail.relative_physical_stats === 0) parts.push('Ataque = Defensa');
      if (detail.gender === 1) parts.push('(hembra)');
      if (detail.gender === 2) parts.push('(macho)');
      if (detail.party_species) parts.push('con ' + detail.party_species.name + ' en equipo');
      if (detail.party_type) parts.push('con tipo ' + detail.party_type.name + ' en equipo');
      if (parts.length === 0) parts.push('Subir nivel');
    } else if (trigger === 'use-item') {
      var itemName = detail.item ? detail.item.name.replace(/-/g, ' ') : 'objeto';
      parts.push('Usar ' + itemName);
      if (detail.gender === 1) parts.push('(hembra)');
      if (detail.gender === 2) parts.push('(macho)');
    } else if (trigger === 'trade') {
      parts.push('Intercambio');
      if (detail.held_item) parts.push('con ' + detail.held_item.name.replace(/-/g, ' '));
      if (detail.trade_species) parts.push('por ' + detail.trade_species.name);
    } else if (trigger === 'shed') {
      parts.push('Espacio libre + Poke Ball');
    } else if (trigger === 'spin') {
      parts.push('Girar');
    } else if (trigger === 'take-damage') {
      parts.push('Recibir dano');
    } else if (trigger === 'three-critical-hits') {
      parts.push('3 golpes criticos');
    } else if (trigger === 'other') {
      parts.push('Especial');
    } else {
      parts.push(trigger ? trigger.replace(/-/g, ' ') : 'Especial');
    }

    return parts.join(', ');
  }

  // ============================================
  // FILTERS
  // ============================================

  function applyFilters() {
    var result = state.allPokemon;

    if (state.filters.searchText) {
      var search = state.filters.searchText.toLowerCase().trim();
      result = result.filter(function (p) { return p.name.includes(search); });
    }

    if (state.filters.dexNumber !== null && state.filters.dexNumber !== '') {
      var num = parseInt(state.filters.dexNumber);
      if (!isNaN(num) && num > 0) {
        result = result.filter(function (p) { return p.id === num; });
      }
    }

    if (state.filters.type) {
      var typeName = state.filters.type;
      result = result.filter(function (p) {
        var types = getCachedTypes(p.id);
        return types && types.indexOf(typeName) !== -1;
      });
    }

    if (state.filters.generation) {
      var genId = parseInt(state.filters.generation);
      var gen = GENERATION_RANGES.find(function (g) { return g.id === genId; });
      if (gen) {
        result = result.filter(function (p) { return p.id >= gen.start && p.id <= gen.end; });
      }
    }

    state.filteredPokemon = result;
  }

  // ============================================
  // RENDERER (Virtual Scrolling)
  // ============================================

  var CARD_WIDTH = 104;
  var CARD_HEIGHT = 120;
  var BUFFER_ROWS = 3;
  var GAP = 8;
  var containerEl = null;
  var gridEl = null;
  var columnsPerRow = 1;
  var lastRenderedKey = '';

  function initRenderer() {
    containerEl = document.getElementById('pokemon-grid-viewport');
    gridEl = document.getElementById('pokemon-grid');
    calculateColumns();

    window.addEventListener('resize', function () {
      calculateColumns();
      renderGrid();
    });

    containerEl.addEventListener('scroll', function () {
      renderGrid();
    });
  }

  function calculateColumns() {
    if (!containerEl) return;
    var containerWidth = containerEl.clientWidth - 16;
    columnsPerRow = Math.max(1, Math.floor(containerWidth / CARD_WIDTH));
  }

  function renderGrid() {
    if (!containerEl || !gridEl) return;

    var filteredPokemon = state.filteredPokemon;
    var selectedPokemonId = state.selectedPokemonId;
    var totalRows = Math.ceil(filteredPokemon.length / columnsPerRow);
    var totalHeight = totalRows * CARD_HEIGHT;

    gridEl.style.height = totalHeight + 'px';

    var scrollTop = containerEl.scrollTop;
    var viewportHeight = containerEl.clientHeight;

    var firstVisibleRow = Math.floor(scrollTop / CARD_HEIGHT);
    var lastVisibleRow = Math.ceil((scrollTop + viewportHeight) / CARD_HEIGHT);

    var startRow = Math.max(0, firstVisibleRow - BUFFER_ROWS);
    var endRow = Math.min(totalRows, lastVisibleRow + BUFFER_ROWS);

    var startIndex = startRow * columnsPerRow;
    var endIndex = Math.min(filteredPokemon.length, endRow * columnsPerRow);

    var renderKey = startIndex + '-' + endIndex + '-' + selectedPokemonId + '-' + filteredPokemon.length;
    if (renderKey === lastRenderedKey) return;
    lastRenderedKey = renderKey;

    gridEl.innerHTML = '';
    var fragment = document.createDocumentFragment();

    for (var i = startIndex; i < endIndex; i++) {
      var p = filteredPokemon[i];
      var row = Math.floor(i / columnsPerRow);
      var col = i % columnsPerRow;

      var card = createCardElement(p, row, col, selectedPokemonId);
      fragment.appendChild(card);
    }

    gridEl.appendChild(fragment);

    var countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = filteredPokemon.length;
  }

  function createCardElement(pokemon, row, col, selectedId) {
    var card = document.createElement('div');
    card.className = 'pokemon-card';
    if (pokemon.id === selectedId) card.classList.add('selected');
    card.setAttribute('data-id', pokemon.id);

    card.style.position = 'absolute';
    card.style.top = (row * CARD_HEIGHT) + 'px';
    card.style.left = (col * CARD_WIDTH) + 'px';
    card.style.width = (CARD_WIDTH - GAP) + 'px';
    card.style.height = (CARD_HEIGHT - GAP) + 'px';

    var spriteUrl = getAnimatedSpriteUrl(pokemon.id, pokemon.name);
    var fallbackUrl = getStaticSpriteUrl(pokemon.id);
    var types = getCachedTypes(pokemon.id);
    var typeBadges = types
      ? types.map(function (t) { return '<span class="type-badge type-' + t + '">' + t + '</span>'; }).join('')
      : '';

    card.innerHTML =
      '<div class="card-sprite-container">' +
      '<img class="card-sprite" src="' + spriteUrl + '" alt="' + pokemon.name + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + fallbackUrl + '\';">' +
      '</div>' +
      '<div class="card-info">' +
      '<span class="card-dex-number">#' + String(pokemon.id).padStart(4, '0') + '</span>' +
      '<span class="card-name">' + formatName(pokemon.name) + '</span>' +
      '</div>' +
      '<div class="card-types">' + typeBadges + '</div>';

    return card;
  }

  function forceRender() {
    lastRenderedKey = '';
    renderGrid();
  }

  function scrollToTop() {
    if (containerEl) containerEl.scrollTop = 0;
  }

  // ============================================
  // DETAIL PANEL
  // ============================================

  function showPokemonDetail(id, name) {
    state.selectedPokemonId = id;

    var emptyEl = document.getElementById('detail-empty');
    var contentEl = document.getElementById('detail-content');
    var loadingEl = document.getElementById('detail-loading');
    var panelEl = document.getElementById('detail-panel');

    emptyEl.classList.add('hidden');
    contentEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');
    panelEl.classList.add('mobile-visible');

    fetchSpeciesDetail(id)
      .then(function (species) {
        return fetchEvolutionChain(species.evolutionChainId).then(function (evoStages) {
          renderDetail(id, name, species, evoStages);
        });
      })
      .catch(function (err) {
        console.error('Error al cargar detalle:', err);
        loadingEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
      });
  }

  function renderDetail(id, name, species, evoStages) {
    var loadingEl = document.getElementById('detail-loading');
    var contentEl = document.getElementById('detail-content');

    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    // Sprite
    var spriteUrl = getAnimatedSpriteUrl(id, name);
    var fallbackUrl = getStaticSpriteUrl(id);
    var spriteEl = document.getElementById('detail-sprite');
    spriteEl.src = spriteUrl;
    spriteEl.alt = formatName(name);
    spriteEl.onerror = function () { this.onerror = null; this.src = fallbackUrl; };

    // Nombre y numero
    document.getElementById('detail-name').textContent = formatName(name);
    document.getElementById('detail-dex-number').textContent = '#' + String(id).padStart(4, '0');

    // Tipos
    var types = getCachedTypes(id) || [];
    document.getElementById('detail-types').innerHTML = types
      .map(function (t) { return '<span class="type-badge type-' + t + '">' + t + '</span>'; })
      .join('');

    // Generacion
    var gen = getGenerationForId(id);
    document.getElementById('detail-generation').textContent = gen ? gen.label : species.generationName;

    // Genero (categoria)
    document.getElementById('detail-genus').textContent = species.genus;

    // Info fisica (altura / peso)
    renderPhysicalInfo(id);

    // Habilidades
    renderAbilities(id);

    // Descripcion
    document.getElementById('detail-flavor-text').textContent = species.flavorText;

    // Estadisticas base
    renderStats(id);

    // Cadena evolutiva
    renderEvolutionChain(evoStages, id);
  }

  function renderPhysicalInfo(id) {
    var container = document.getElementById('detail-physical');
    var details = cache.pokemonDetails[id];
    if (!details || !details.height) {
      container.innerHTML = '';
      return;
    }
    var heightM = (details.height / 10).toFixed(1);
    var weightKg = (details.weight / 10).toFixed(1);
    container.innerHTML =
      '<div class="physical-item">' +
      '<span class="physical-label">Altura</span>' +
      '<span class="physical-value">' + heightM + ' m</span>' +
      '</div>' +
      '<div class="physical-item">' +
      '<span class="physical-label">Peso</span>' +
      '<span class="physical-value">' + weightKg + ' kg</span>' +
      '</div>';
  }

  function renderAbilities(id) {
    var container = document.getElementById('detail-abilities-list');
    var details = cache.pokemonDetails[id];
    if (!details || !details.abilities || details.abilities.length === 0) {
      container.innerHTML = '<span class="ability-badge">-</span>';
      return;
    }
    container.innerHTML = details.abilities.map(function (a) {
      var displayName = a.name.replace(/-/g, ' ').split(' ').map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }).join(' ');
      var cls = 'ability-badge' + (a.isHidden ? ' ability-hidden' : '');
      var suffix = a.isHidden ? ' <span class="hidden-tag">(oculta)</span>' : '';
      return '<span class="' + cls + '">' + displayName + suffix + '</span>';
    }).join('');
  }

  var STAT_LABELS = {
    'hp': 'HP',
    'attack': 'Ataque',
    'defense': 'Defensa',
    'special-attack': 'At. Esp.',
    'special-defense': 'Def. Esp.',
    'speed': 'Velocidad',
  };

  function getStatColor(value) {
    if (value < 50) return '#E74C3C';
    if (value < 80) return '#E67E22';
    if (value < 100) return '#F1C40F';
    if (value < 130) return '#2ECC71';
    return '#3498DB';
  }

  function renderStats(id) {
    var container = document.getElementById('detail-stats-bars');
    var details = cache.pokemonDetails[id];
    if (!details || !details.stats || details.stats.length === 0) {
      container.innerHTML = '<p class="evo-none">Sin datos de stats.</p>';
      return;
    }

    var total = 0;
    var html = '';
    details.stats.forEach(function (stat) {
      total += stat.value;
      var label = STAT_LABELS[stat.name] || stat.name;
      var pct = Math.min(100, Math.round((stat.value / 255) * 100));
      var color = getStatColor(stat.value);
      html +=
        '<div class="stat-row">' +
        '<span class="stat-label">' + label + '</span>' +
        '<span class="stat-value">' + stat.value + '</span>' +
        '<div class="stat-bar-track">' +
        '<div class="stat-bar-fill" style="width:' + pct + '%;background:' + color + ';"></div>' +
        '</div>' +
        '</div>';
    });
    html +=
      '<div class="stat-row stat-total">' +
      '<span class="stat-label">Total</span>' +
      '<span class="stat-value">' + total + '</span>' +
      '<div class="stat-bar-track"></div>' +
      '</div>';
    container.innerHTML = html;
  }

  function renderEvolutionChain(stages, currentId) {
    var container = document.getElementById('evolution-chain-container');
    container.innerHTML = '';

    if (!stages || stages.length === 0 ||
      (stages.length === 1 && stages[0].length <= 1)) {
      container.innerHTML = '<p class="evo-none">Este Pokemon no evoluciona.</p>';
      return;
    }

    var chainEl = document.createElement('div');
    chainEl.className = 'evo-chain';

    for (var s = 0; s < stages.length; s++) {
      var stage = stages[s];
      var stageEl = document.createElement('div');
      stageEl.className = 'evo-stage';

      for (var m = 0; m < stage.length; m++) {
        var pokemon = stage[m];
        var memberEl = document.createElement('div');
        memberEl.className = 'evo-member';
        if (pokemon.id === currentId) memberEl.classList.add('current');
        memberEl.setAttribute('data-id', pokemon.id);
        memberEl.setAttribute('data-name', pokemon.name);

        var spriteUrl = getAnimatedSpriteUrl(pokemon.id, pokemon.name);
        var fallbackUrl = getStaticSpriteUrl(pokemon.id);

        var methodHtml = s > 0
          ? '<span class="evo-method">' + pokemon.methods.join(' / ') + '</span>'
          : '';

        memberEl.innerHTML =
          '<img class="evo-sprite" src="' + spriteUrl + '" alt="' + pokemon.name + '" onerror="this.onerror=null;this.src=\'' + fallbackUrl + '\';">' +
          '<span class="evo-name">' + formatName(pokemon.name) + '</span>' +
          methodHtml;

        stageEl.appendChild(memberEl);
      }

      chainEl.appendChild(stageEl);

      if (s < stages.length - 1) {
        var arrowEl = document.createElement('div');
        arrowEl.className = 'evo-arrow';
        arrowEl.textContent = '\u25B6';
        chainEl.appendChild(arrowEl);
      }
    }

    container.appendChild(chainEl);
  }

  function closeDetail() {
    state.selectedPokemonId = null;
    document.getElementById('detail-content').classList.add('hidden');
    document.getElementById('detail-loading').classList.add('hidden');
    document.getElementById('detail-empty').classList.remove('hidden');
    document.getElementById('detail-panel').classList.remove('mobile-visible');
  }

  // ============================================
  // APP INIT
  // ============================================

  function populateTypeFilter() {
    var select = document.getElementById('type-filter');
    POKEMON_TYPES.forEach(function (type) {
      var opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      select.appendChild(opt);
    });
  }

  function populateGenFilter() {
    var select = document.getElementById('gen-filter');
    GENERATION_RANGES.forEach(function (gen) {
      var opt = document.createElement('option');
      opt.value = gen.id;
      opt.textContent = gen.label;
      select.appendChild(opt);
    });
  }

  function wireEventListeners() {
    // Busqueda por nombre con debounce
    var searchInput = document.getElementById('search-input');
    var searchTimeout = null;
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        state.filters.searchText = searchInput.value;
        applyFilters();
        scrollToTop();
        forceRender();
      }, 250);
    });

    // Busqueda por numero de Pokedex
    var dexInput = document.getElementById('dex-number-input');
    dexInput.addEventListener('input', function () {
      state.filters.dexNumber = dexInput.value || null;
      applyFilters();
      forceRender();
    });

    // Filtro por tipo
    document.getElementById('type-filter').addEventListener('change', function (e) {
      state.filters.type = e.target.value;
      applyFilters();
      scrollToTop();
      forceRender();
    });

    // Filtro por generacion
    document.getElementById('gen-filter').addEventListener('change', function (e) {
      state.filters.generation = e.target.value;
      applyFilters();
      scrollToTop();
      forceRender();
    });

    // Boton limpiar filtros
    document.getElementById('clear-filters-btn').addEventListener('click', function () {
      state.filters = { searchText: '', dexNumber: null, type: '', generation: '' };
      state.filteredPokemon = state.allPokemon.slice();
      document.getElementById('search-input').value = '';
      document.getElementById('dex-number-input').value = '';
      document.getElementById('type-filter').value = '';
      document.getElementById('gen-filter').value = '';
      scrollToTop();
      forceRender();
    });

    // Click en card de Pokemon (delegacion)
    document.getElementById('pokemon-grid').addEventListener('click', function (e) {
      var card = e.target.closest('.pokemon-card');
      if (card) {
        var id = parseInt(card.getAttribute('data-id'));
        var pokemon = state.allPokemon.find(function (p) { return p.id === id; });
        if (pokemon) {
          showPokemonDetail(id, pokemon.name);
          forceRender();
        }
      }
    });

    // Click en miembros de la cadena evolutiva
    document.getElementById('evolution-chain-container').addEventListener('click', function (e) {
      var member = e.target.closest('.evo-member');
      if (member) {
        var id = parseInt(member.getAttribute('data-id'));
        var name = member.getAttribute('data-name');
        if (id && name) {
          showPokemonDetail(id, name);
          forceRender();
        }
      }
    });

    // Boton cerrar detalle
    document.getElementById('detail-close-btn').addEventListener('click', function () {
      closeDetail();
      forceRender();
    });

    // Cerrar con Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.selectedPokemonId !== null) {
        closeDetail();
        forceRender();
      }
    });
  }

  function updateLoadingMessage(msg) {
    var el = document.getElementById('loading-message');
    if (el) el.textContent = msg;
  }

  function updateProgress(pct) {
    var fill = document.getElementById('loading-progress-fill');
    var text = document.getElementById('loading-progress-text');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = pct + '%';
  }

  async function init() {
    populateTypeFilter();
    populateGenFilter();
    wireEventListeners();
    initRenderer();

    // === FASE 1: Lista completa ===
    updateLoadingMessage('Conectando con la Pokedex...');
    updateProgress(10);

    try {
      var pokemonList = await fetchPokemonList();
      state.allPokemon = pokemonList;
      state.filteredPokemon = pokemonList.slice();

      updateProgress(100);

      // Ocultar overlay
      document.getElementById('loading-overlay').classList.add('hidden');

      // Render inicial
      forceRender();

      // === FASE 2: Tipos en background ===
      await fetchAllPokemonDetails(function (completed, total) {
        var pct = Math.round((completed / total) * 100);
        var infoEl = document.getElementById('results-info');
        if (completed < total) {
          infoEl.innerHTML = '<span>Cargando tipos... ' + pct + '%</span>';
        } else {
          infoEl.innerHTML = '<span id="results-count">' + state.filteredPokemon.length + '</span> Pokemon encontrados';
        }

        if (completed % 200 === 0 || completed === total) {
          forceRender();
        }
      });

      forceRender();

    } catch (err) {
      console.error('Error al inicializar:', err);
      updateLoadingMessage('Error al cargar. Recarga la pagina.');
    }
  }

  // Iniciar cuando el DOM este listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
