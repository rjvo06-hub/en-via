(function (window) {
    'use strict';

    var SUPABASE_URL = 'https://sgpwdejwfbqsswoibohu.supabase.co';
    var SUPABASE_ANON_KEY = 'sb_publishable_891ubyEIooQ7Ik7vdEACZQ_vfXcW37g';
    var AUTH_STORAGE_KEY = 'envia_supabase_session_v1';

    function guardarSesionLocal(session) {
        try {
            if (session && session.access_token) {
                window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
            } else {
                window.localStorage.removeItem(AUTH_STORAGE_KEY);
            }
        } catch (e) {}
    }

    function leerSesionLocal() {
        try {
            var raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function obtenerAccessTokenActual(sdkClient) {
        if (sdkClient && sdkClient.auth && typeof sdkClient.auth.getSession === 'function') {
            return sdkClient.auth.getSession().then(function (res) {
                var sess = (res && res.data && res.data.session) ? res.data.session : leerSesionLocal();
                if (sess) guardarSesionLocal(sess);
                return sess && sess.access_token ? sess.access_token : SUPABASE_ANON_KEY;
            }).catch(function () {
                var local = leerSesionLocal();
                return local && local.access_token ? local.access_token : SUPABASE_ANON_KEY;
            });
        }
        var local = leerSesionLocal();
        return Promise.resolve(local && local.access_token ? local.access_token : SUPABASE_ANON_KEY);
    }

    function createRestFallbackClient(url, key, sdkRef) {
        var baseUrl = url.replace(/\/+$/, '') + '/rest/v1/';

        function makeQuery(table, initCols) {
            var state = {
                table: table,
                selectCols: initCols || '*',
                filters: [],
                orderBy: null,
                limitNum: null,
                singleMode: false,
                method: 'GET',
                bodyPayload: null
            };

            function buildGetUrl() {
                var qs = ['select=' + encodeURIComponent(state.selectCols)];
                for (var i = 0; i < state.filters.length; i++) {
                    qs.push(state.filters[i]);
                }
                if (state.orderBy) {
                    qs.push('order=' + encodeURIComponent(state.orderBy));
                }
                if (state.limitNum !== null) {
                    qs.push('limit=' + state.limitNum);
                }
                return baseUrl + state.table + '?' + qs.join('&');
            }

            function execRequest() {
                return obtenerAccessTokenActual(sdkRef).then(function (token) {
                    var headers = {
                        'apikey': key,
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    };
                    var targetUrl = state.method === 'POST' ? (baseUrl + state.table) : buildGetUrl();
                    var opts = { method: state.method, headers: headers };
                    if (state.bodyPayload !== null) {
                        opts.body = JSON.stringify(state.bodyPayload);
                    }
                    return window.fetch(targetUrl, opts).then(function (r) {
                        return r.json().then(function (json) {
                            if (!r.ok) {
                                return {
                                    data: null,
                                    error: { message: (json && json.message) ? json.message : r.statusText }
                                };
                            }
                            if (state.singleMode) {
                                return { data: Array.isArray(json) ? (json[0] || null) : json, error: null };
                            }
                            return { data: json, error: null };
                        });
                    });
                });
            }

            var qb = {
                select: function (cols) {
                    if (cols) state.selectCols = cols;
                    return qb;
                },
                eq: function (col, val) {
                    state.filters.push(encodeURIComponent(col) + '=eq.' + encodeURIComponent(val));
                    return qb;
                },
                ilike: function (col, val) {
                    state.filters.push(encodeURIComponent(col) + '=ilike.' + encodeURIComponent(val));
                    return qb;
                },
                in: function (col, arr) {
                    var encodedVals = (arr || []).map(function (v) { return encodeURIComponent(v); }).join(',');
                    state.filters.push(encodeURIComponent(col) + '=in.(' + encodedVals + ')');
                    return qb;
                },
                not: function (col, op, val) {
                    var right = (val === null || op === 'is') ? 'is.null' : (op + '.' + val);
                    state.filters.push(encodeURIComponent(col) + '=not.' + right);
                    return qb;
                },
                order: function (col, opts) {
                    var dir = (opts && opts.ascending === false) ? 'desc' : 'asc';
                    state.orderBy = col + '.' + dir;
                    return qb;
                },
                limit: function (n) {
                    state.limitNum = n;
                    return qb;
                },
                single: function () {
                    state.singleMode = true;
                    state.limitNum = 1;
                    return qb;
                },
                maybeSingle: function () {
                    state.singleMode = true;
                    state.limitNum = 1;
                    return qb;
                },
                insert: function (rows) {
                    state.method = 'POST';
                    state.bodyPayload = Array.isArray(rows) ? rows : [rows];
                    return qb;
                },
                update: function (values) {
                    state.method = 'PATCH';
                    state.bodyPayload = values;
                    return qb;
                },
                delete: function () {
                    state.method = 'DELETE';
                    return qb;
                },
                then: function (resolve, reject) {
                    return execRequest().then(resolve, reject);
                }
            };
            return qb;
        }

        function execRpc(fnName, params) {
            return obtenerAccessTokenActual(sdkRef).then(function (token) {
                var headers = {
                    'apikey': key,
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                };
                return window.fetch(baseUrl + 'rpc/' + encodeURIComponent(fnName), {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(params || {})
                }).then(function (r) {
                    return r.json().then(function (json) {
                        if (!r.ok) {
                            return {
                                data: null,
                                error: { message: (json && json.message) ? json.message : r.statusText }
                            };
                        }
                        return { data: json, error: null };
                    });
                });
            });
        }

        return {
            _isRestFallback: true,
            from: function (table) {
                return makeQuery(table, '*');
            },
            rpc: function (fnName, params) {
                return execRpc(fnName, params);
            }
        };
    }

    var sdkClient = null;
    window.supabaseIsRealtime = false;

    try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            sdkClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false
                }
            });
            window.supabaseIsRealtime = true;
        }
    } catch (e) {
        sdkClient = null;
    }

    var restClient = createRestFallbackClient(SUPABASE_URL, SUPABASE_ANON_KEY, sdkClient);

    window.supabaseClient = sdkClient || restClient;

    window.EnviaAuth = {
        generarUsuarioDesdeNombre: function (nombreTexto) {
            if (!nombreTexto) return '';
            var limpio = String(nombreTexto).replace(/^\s+|\s+$/g, '').toLowerCase();
            var partes = limpio.split(/\s+/);
            if (partes.length >= 2) {
                var inicial = partes[0].charAt(0);
                var apellidoPegado = partes.slice(1).join('');
                return inicial + apellidoPegado;
            }
            return partes[0] || '';
        },
        limpiarEstadoLocal: function () {
            guardarSesionLocal(null);
            try {
                window.sessionStorage.removeItem('conductor_en_via');
                window.sessionStorage.removeItem('conductor_id_en_via');
                window.sessionStorage.removeItem('cliente_en_via');
                window.sessionStorage.removeItem('cliente_id_en_via');
                window.sessionStorage.removeItem('carrera_activa_id');
            } catch (e) {}

            if (sdkClient) {
                try {
                    if (typeof sdkClient.removeAllChannels === 'function') {
                        sdkClient.removeAllChannels();
                    }
                } catch (e) {}
            }
        }
    };
})(window);
