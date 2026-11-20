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

        return {
            _isRestFallback: true,
            from: function (table) {
                return makeQuery(table, '*');
            },
            rpc: function (fnName, params) {
                return obtenerAccessTokenActual(sdkRef).then(function (token) {
                    return window.fetch(url.replace(/\/+$/, '') + '/rest/v1/rpc/' + encodeURIComponent(fnName), {
                        method: 'POST',
                        headers: {
                            'apikey': key,
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        },
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
                    detectSessionInUrl: true
                }
            });
            window.supabaseIsRealtime = true;
        }
    } catch (e) {
        sdkClient = null;
    }

    var restClient = createRestFallbackClient(SUPABASE_URL, SUPABASE_ANON_KEY, sdkClient);
    window.supabaseClient = sdkClient || restClient;

    if (sdkClient && sdkClient.auth && typeof sdkClient.auth.onAuthStateChange === 'function') {
        sdkClient.auth.onAuthStateChange(function (_event, session) {
            guardarSesionLocal(session);
        });
    }

    function asegurarPerfil(user, rolPorDefecto) {
        var rolSeguro = (rolPorDefecto === 'conductor' || rolPorDefecto === 'usuario') ? rolPorDefecto : 'usuario';
        return restClient.from('perfiles').select('*').eq('id', user.id).maybeSingle().then(function (res) {
            if (res.error) {
                return { perfil: null, error: res.error };
            }
            if (res.data) {
                return { perfil: res.data, error: null };
            }
            return restClient.from('perfiles').insert([{
                id: user.id,
                email: user.email || '',
                rol: rolSeguro,
                activo: true
            }]).select().single().then(function (insRes) {
                return { perfil: insRes.data || null, error: insRes.error || null };
            });
        });
    }

    window.EnviaAuth = {
        loginConductorClave: function (identificador, clave) {
            var payload = {
                p_identificador: identificador,
                p_clave: clave
            };

            var rpcCall = (sdkClient && typeof sdkClient.rpc === 'function')
                ? sdkClient.rpc('login_conductor_clave', payload)
                : restClient.rpc('login_conductor_clave', payload);

            return rpcCall.then(function (res) {
                if (res.error) {
                    return { conductor: null, error: res.error };
                }
                var rows = res.data;
                var conductor = Array.isArray(rows) ? (rows[0] || null) : rows;
                if (!conductor || !conductor.id) {
                    return { conductor: null, error: { message: 'Nombre o clave incorrectos, o conductor inactivo.' } };
                }
                return { conductor: conductor, error: null };
            });
        },

        loginEmail: function (email, password) {
            if (sdkClient && sdkClient.auth) {
                return sdkClient.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
                    if (res.error) return { data: null, error: res.error };
                    if (res.data && res.data.session) guardarSesionLocal(res.data.session);
                    return { data: res.data, error: null };
                });
            }
            return window.fetch(SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/token?grant_type=password', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email, password: password })
            }).then(function (r) { return r.json(); }).then(function (json) {
                if (!json || !json.access_token) {
                    return { data: null, error: { message: (json && (json.msg || json.error_description)) || 'Error al iniciar sesión' } };
                }
                guardarSesionLocal(json);
                return { data: { session: json, user: json.user }, error: null };
            });
        },

        registroEmail: function (email, password, rol, nombre, telefono) {
            var rolSeguro = (rol === 'conductor' || rol === 'usuario') ? rol : 'usuario';
            var meta = { rol: rolSeguro };
            if (nombre) meta.nombre = nombre;
            if (telefono) meta.telefono = telefono;

            if (sdkClient && sdkClient.auth) {
                return sdkClient.auth.signUp({
                    email: email,
                    password: password,
                    options: { data: meta }
                }).then(function (res) {
                    if (res.error) return { data: null, error: res.error };
                    if (res.data && res.data.session) guardarSesionLocal(res.data.session);
                    return { data: res.data, error: null };
                });
            }
            return window.fetch(SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/signup', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    data: meta
                })
            }).then(function (r) { return r.json(); }).then(function (json) {
                if (json && json.error) {
                    return { data: null, error: { message: json.error } };
                }
                if (json && json.access_token) guardarSesionLocal(json);
                return { data: json, error: null };
            });
        },

        loginGoogle: function (rolPorDefecto, redirectUrl) {
            var rolSeguro = (rolPorDefecto === 'conductor' || rolPorDefecto === 'usuario') ? rolPorDefecto : 'usuario';
            try {
                window.sessionStorage.setItem('envia_rol_oauth_pendiente', rolSeguro);
            } catch (e) {}

            var destino = redirectUrl || window.location.href;
            if (sdkClient && sdkClient.auth && typeof sdkClient.auth.signInWithOAuth === 'function') {
                return sdkClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: destino }
                });
            }
            var authUrl = SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(destino);
            window.location.href = authUrl;
            return Promise.resolve({ data: null, error: null });
        },

        getSessionYPerfil: function (rolPorDefectoSiNuevo) {
            var rolPendiente = rolPorDefectoSiNuevo;
            try {
                var savedRol = window.sessionStorage.getItem('envia_rol_oauth_pendiente');
                if (savedRol) rolPendiente = savedRol;
            } catch (e) {}

            var getUserPromise;
            if (sdkClient && sdkClient.auth && typeof sdkClient.auth.getUser === 'function') {
                getUserPromise = sdkClient.auth.getUser().then(function (res) {
                    return (res && res.data && res.data.user) ? res.data.user : null;
                }).catch(function () {
                    var local = leerSesionLocal();
                    return local && local.user ? local.user : null;
                });
            } else {
                var local = leerSesionLocal();
                getUserPromise = Promise.resolve(local && local.user ? local.user : null);
            }

            return getUserPromise.then(function (user) {
                if (!user) {
                    return { user: null, perfil: null, error: null };
                }
                return asegurarPerfil(user, rolPendiente).then(function (pRes) {
                    try { window.sessionStorage.removeItem('envia_rol_oauth_pendiente'); } catch (e) {}
                    return {
                        user: user,
                        perfil: pRes.perfil,
                        error: pRes.error
                    };
                });
            });
        },

        logout: function () {
            guardarSesionLocal(null);
            try {
                window.sessionStorage.removeItem('envia_rol_oauth_pendiente');
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

                if (sdkClient.auth && typeof sdkClient.auth.signOut === 'function') {
                    return sdkClient.auth.signOut().catch(function () {});
                }
            }
            return Promise.resolve();
        }
    };
})(window);
