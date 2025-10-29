// Variables globales
let productos = [];
let carrito = [];
let ventaEnProceso = false;  // ← Flag para prevenir ventas duplicadas
let errorStockDetectado = false;  // ← Flag para bloquear ventas si hubo error de stock

// Función para obtener el token CSRF
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const csrftoken = getCookie('csrftoken');
let eventosCargados = false;  // ← Prevenir carga duplicada de eventos

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 DOMContentLoaded ejecutado');
  console.log('   eventosCargados:', eventosCargados);
  
  // ✅ PREVENIR CARGA DUPLICADA
  if (eventosCargados) {
    console.warn('⚠️ ADVERTENCIA: Eventos ya fueron cargados. Evitando duplicación.');
    return;
  }
  
  eventosCargados = true;
  console.log('✅ Cargando eventos por primera vez');
  
  const searchInput = document.getElementById('searchProducts');
  const btnLimpiar = document.getElementById('btnLimpiar');
  const btnCheckout = document.getElementById('btnCheckout');

  if (searchInput) {
    searchInput.addEventListener('input', () => buscarProductos());
    console.log('✅ Evento agregado: searchInput');
  }
  
  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => limpiarCarrito());
    console.log('✅ Evento agregado: btnLimpiar');
  }
  
  if (btnCheckout) {
    btnCheckout.addEventListener('click', () => {
      console.log('🖱️ CLICK DETECTADO en btnCheckout');
      console.log('   Timestamp:', new Date().toISOString());
      procesarVenta();
    });
    console.log('✅ Evento agregado: btnCheckout');
  }

  cargarProductosDesdeAPI();
  actualizarCarrito();
  
  console.log('✅ Inicialización completada');
});

// Cargar productos desde la API
async function cargarProductosDesdeAPI() {
  try {
    const busqueda = document.getElementById('searchProducts')?.value || '';
    const url = `${window.API_PRODUCTOS_LISTAR}?buscar=${encodeURIComponent(busqueda)}&soloActivos=1&estado=activo`;
    
    console.log('🔍 Consultando productos para venta:', url);
    
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const data = await response.json();
    
    console.log('✅ Productos cargados:', data);
    
    if (data.ok) {
      productos = data.data || [];
      console.log(`📦 Total productos activos: ${productos.length}`);
      renderizarProductos(productos);
    } else {
      console.error('❌ Error al cargar productos:', data.msg);
    }
  } catch (error) {
    console.error('❌ Error en la petición:', error);
  }
}

function renderizarProductos(items) {
  const productsGrid = document.getElementById('productsGrid');
  if (!productsGrid) return;
  
  productsGrid.innerHTML = '';

  items.forEach(producto => {
    const stockActual = parseInt(producto.stockActual) || 0;
    const card = document.createElement('div');
    card.className = 'product-card' + (stockActual === 0 ? ' critico' : '');
    card.onclick = () => {
      if (stockActual > 0) {
        agregarAlCarrito(producto);
      }
    };

    const precioVenta = parseFloat(producto.precioVenta) || 0;
    
    card.innerHTML = `
      <div class="product-code">${producto.codigo || 'N/A'}</div>
      <div class="product-name">${producto.nombre || 'N/A'}</div>
      <div class="product-price">Q ${precioVenta.toFixed(2)}</div>
      <div class="product-stock">Stock: ${stockActual}</div>
    `;

    productsGrid.appendChild(card);
  });
}

function buscarProductos() {
  cargarProductosDesdeAPI();
}

function agregarAlCarrito(producto) {
  const stockActual = parseInt(producto.stockActual) || 0;
  const descuentoMaximo = parseFloat(producto.descuentoMaximoPct) || 0;
  
  console.log(`🛒 Agregando producto: ${producto.nombre}`);
  console.log(`   - Precio: Q ${producto.precioVenta}`);
  console.log(`   - Stock: ${stockActual}`);
  console.log(`   - Descuento configurado: ${descuentoMaximo}%`);
  
  const itemExistente = carrito.find(item => item.idProducto === producto.idProducto);

  if (itemExistente) {
    if (itemExistente.cantidad < stockActual) {
      itemExistente.cantidad++;
      console.log(`   ✅ Cantidad incrementada a ${itemExistente.cantidad}`);
      actualizarCarrito();
      mostrarNotificacion('Cantidad actualizada');
    } else {
      mostrarError(`Solo hay ${stockActual} unidades disponibles`);
    }
  } else {
    // Agregar nuevo producto al carrito con descuento automático
    carrito.push({
      idProducto: producto.idProducto,
      codigo: producto.codigo,
      nombre: producto.nombre,
      precioUnitario: parseFloat(producto.precioVenta) || 0,
      cantidad: 1,
      descuentoPct: descuentoMaximo,  // ✅ Aplicar descuento automáticamente
      descuentoMaximoPct: descuentoMaximo,
      stockActual: stockActual
    });
    
    // Mensajes informativos
    if (descuentoMaximo > 0) {
      const precioOriginal = parseFloat(producto.precioVenta) || 0;
      const ahorro = precioOriginal * (descuentoMaximo / 100);
      const precioFinal = precioOriginal - ahorro;
      console.log(`   💰 Descuento del ${descuentoMaximo}% aplicado automáticamente`);
      console.log(`   💵 Precio original: Q ${precioOriginal.toFixed(2)} → Precio con descuento: Q ${precioFinal.toFixed(2)}`);
      console.log(`   ✨ Ahorras: Q ${ahorro.toFixed(2)}`);
      actualizarCarrito();
      mostrarNotificacion(`Producto agregado con ${descuentoMaximo}% de descuento automático`);
    } else {
      console.log(`   ℹ️ Este producto NO tiene descuento configurado`);
      actualizarCarrito();
      mostrarNotificacion('Producto agregado al carrito');
    }
  }
}

function actualizarCarrito() {
  const cartItems = document.getElementById('cartItems');
  const btnCheckout = document.getElementById('btnCheckout');

  if (carrito.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <svg viewBox="0 0 24 24" width="64" height="64" opacity="0.3">
          <path d="M5 8h14l-1.5 9H6.5L5 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2"/>
          <circle cx="8" cy="21" r="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <circle cx="18" cy="21" r="2" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
        <p>El carrito está vacío</p>
      </div>
    `;
    btnCheckout.disabled = true;
    actualizarResumen();
    return;
  }

  cartItems.innerHTML = carrito.map((item, index) => {
    const producto = productos.find(p => p.idProducto === item.idProducto);
    const subtotalLinea = item.cantidad * item.precioUnitario;
    const descuentoLinea = (subtotalLinea * item.descuentoPct) / 100;
    const totalLinea = subtotalLinea - descuentoLinea;

    return `
      <div class="cart-item">
        <div class="cart-item-header">
          <div class="cart-item-info">
            <h4>${item.nombre}</h4>
            <span>${item.codigo} • Q ${item.precioUnitario.toFixed(2)} c/u</span>
          </div>
          <button class="btn-remove" onclick="eliminarDelCarrito(${index})" title="Eliminar">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
        <div class="cart-item-controls">
          <div class="quantity-control">
            <button class="quantity-btn" onclick="actualizarCantidad(${index}, -1)">-</button>
            <input type="number" class="quantity-input" value="${item.cantidad}" min="1" max="${producto?.stockActual || item.stockActual}" 
                   onchange="cambiarCantidad(${index}, this.value)" />
            <button class="quantity-btn" onclick="actualizarCantidad(${index}, 1)">+</button>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <div class="cart-item-price">
              ${item.descuentoPct > 0 ? `<span style="text-decoration: line-through; opacity: 0.5; margin-right: 8px;">Q ${subtotalLinea.toFixed(2)}</span>` : ''}
              Q ${totalLinea.toFixed(2)}
            </div>
            ${item.descuentoPct > 0 ? `<span style="font-size: 11px; color: #34d399;">Ahorras: -${item.descuentoPct}% (Q ${descuentoLinea.toFixed(2)})</span>` : ''}
          </div>
        </div>
        ${item.descuentoMaximoPct > 0 ? `
          <div style="margin-top: 12px; padding: 10px; background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 8px;">
            <label style="display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 6px;">
              <span>💰 Descuento (%):</span>
              <span style="color: #34d399; font-weight: 600;">Máx: ${item.descuentoMaximoPct}%</span>
            </label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="number" 
                     value="${item.descuentoPct}" 
                     min="0" 
                     max="${item.descuentoMaximoPct}" 
                     step="0.5"
                     placeholder="0"
                     style="flex: 1; padding: 8px 12px; background: rgba(0,0,0,0.4); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 6px; color: #fff; font-size: 14px; font-weight: 600;"
                     onchange="actualizarDescuento(${index}, this.value)"
                     onfocus="this.style.borderColor='rgba(52, 211, 153, 0.6)'"
                     onblur="this.style.borderColor='rgba(52, 211, 153, 0.3)'" />
              <button onclick="actualizarDescuento(${index}, ${item.descuentoMaximoPct})" 
                      style="padding: 8px 12px; background: rgba(52, 211, 153, 0.2); border: 1px solid rgba(52, 211, 153, 0.4); border-radius: 6px; color: #34d399; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;"
                      onmouseover="this.style.background='rgba(52, 211, 153, 0.3)'"
                      onmouseout="this.style.background='rgba(52, 211, 153, 0.2)'">
                Máx
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // ✅ VALIDAR STOCK ANTES DE HABILITAR BOTÓN
  let stockValido = true;
  
  // 🚫 SI HUBO ERROR DE STOCK PREVIAMENTE, BLOQUEAR BOTÓN
  if (errorStockDetectado) {
    console.log(`🚫 errorStockDetectado = true - BOTÓN BLOQUEADO`);
    console.log(`   ⚠️ Para desbloquear: elimina el producto y agrégalo de nuevo`);
    btnCheckout.disabled = true;
    actualizarResumen();
    return;
  }
  
  for (const item of carrito) {
    const producto = productos.find(p => p.idProducto === item.idProducto);
    const stockActual = parseInt(producto?.stockActual) || 0;
    
    console.log(`🔍 Validando para habilitar botón:`);
    console.log(`   ${item.nombre}: cantidad=${item.cantidad}, stock=${stockActual}`);
    
    if (item.cantidad > stockActual) {
      console.log(`   ❌ Stock insuficiente - botón DESHABILITADO`);
      stockValido = false;
      break;
    }
  }
  
  btnCheckout.disabled = !stockValido;
  console.log(`🎯 Botón "Procesar Venta": ${stockValido ? 'HABILITADO' : 'DESHABILITADO'}`);
  
  actualizarResumen();
}

function actualizarCantidad(index, delta) {
  const item = carrito[index];
  const producto = productos.find(p => p.idProducto === item.idProducto);
  const nuevaCantidad = item.cantidad + delta;

  if (nuevaCantidad < 1) {
    eliminarDelCarrito(index);
    return;
  }

  if (nuevaCantidad > producto.stockActual) {
    mostrarError(`Solo hay ${producto.stockActual} unidades disponibles`);
    return;
  }

  item.cantidad = nuevaCantidad;
  actualizarCarrito();
}

function cambiarCantidad(index, nuevaCantidad) {
  const item = carrito[index];
  const producto = productos.find(p => p.idProducto === item.idProducto);
  const cantidad = parseInt(nuevaCantidad) || 1;

  console.log(`📝 cambiarCantidad() llamada:`);
  console.log(`   Índice: ${index}`);
  console.log(`   Producto: ${item.nombre}`);
  console.log(`   Cantidad anterior: ${item.cantidad}`);
  console.log(`   Nueva cantidad solicitada: ${cantidad}`);
  console.log(`   Stock disponible: ${producto.stockActual}`);

  if (cantidad < 1) {
    console.log(`   ⚠️ Cantidad < 1, eliminando del carrito`);
    eliminarDelCarrito(index);
    return;
  }

  if (cantidad > producto.stockActual) {
    console.log(`   ❌ Cantidad (${cantidad}) excede stock (${producto.stockActual})`);
    
    // ✅ MARCAR ERROR DE STOCK - BLOQUEAR VENTAS
    errorStockDetectado = true;
    console.log(`   🚫 errorStockDetectado = true - VENTAS BLOQUEADAS`);
    
    mostrarError(`⛔ Stock insuficiente. Hay ${producto.stockActual} unidades disponibles. Elimina el producto del carrito y agrégalo de nuevo para poder procesar la venta.`);
    // NO cambiar la cantidad - mantener la anterior
    console.log(`   ✅ Manteniendo cantidad anterior: ${item.cantidad}`);
    // Revertir el input al valor anterior
    actualizarCarrito();
    return;
  }

  console.log(`   ✅ Cantidad válida, actualizando...`);
  item.cantidad = cantidad;
  actualizarCarrito();
}

function actualizarDescuento(index, descuento) {
  const item = carrito[index];
  const descuentoNum = parseFloat(descuento) || 0;

  console.log(`💰 Aplicando descuento de ${descuentoNum}% al producto ${item.nombre} (máx: ${item.descuentoMaximoPct}%)`);

  if (descuentoNum < 0) {
    mostrarError(`El descuento no puede ser negativo`);
    return;
  }

  if (descuentoNum > item.descuentoMaximoPct) {
    mostrarError(`El descuento máximo para este producto es ${item.descuentoMaximoPct}%`);
    return;
  }

  const descuentoAnterior = item.descuentoPct;
  item.descuentoPct = descuentoNum;
  
  actualizarCarrito();
  
  if (descuentoNum > 0 && descuentoNum !== descuentoAnterior) {
    const subtotalLinea = item.cantidad * item.precioUnitario;
    const ahorro = subtotalLinea * (descuentoNum / 100);
    mostrarNotificacion(`Descuento aplicado: ${descuentoNum}% - Ahorras Q ${ahorro.toFixed(2)}`);
  }
}

function eliminarDelCarrito(index) {
  console.log(`🗑️ Eliminando producto del carrito (índice: ${index})`);
  carrito.splice(index, 1);
  
  // ✅ LIMPIAR FLAG DE ERROR AL ELIMINAR PRODUCTO
  errorStockDetectado = false;
  console.log(`✅ errorStockDetectado = false - VENTAS DESBLOQUEADAS`);
  
  actualizarCarrito();
}

function limpiarCarrito() {
  if (carrito.length === 0) return;
  
  if (confirm('¿Desea vaciar el carrito?')) {
    console.log(`🧹 Limpiando carrito completo`);
    carrito = [];
    
    // ✅ LIMPIAR FLAG DE ERROR AL LIMPIAR CARRITO
    errorStockDetectado = false;
    console.log(`✅ errorStockDetectado = false - VENTAS DESBLOQUEADAS`);
    
    actualizarCarrito();
    mostrarNotificacion('Carrito vaciado');
  }
}

function actualizarResumen() {
  let subtotal = 0;
  let descuentos = 0;

  carrito.forEach(item => {
    const subtotalLinea = item.cantidad * item.precioUnitario;
    const descuentoLinea = (subtotalLinea * item.descuentoPct) / 100;
    subtotal += subtotalLinea;
    descuentos += descuentoLinea;
  });

  const total = subtotal - descuentos;

  document.getElementById('subtotal').textContent = `Q ${subtotal.toFixed(2)}`;
  document.getElementById('descuentos').textContent = `Q ${descuentos.toFixed(2)}`;
  document.getElementById('total').textContent = `Q ${total.toFixed(2)}`;
}

async function procesarVenta() {
  const btnCheckout = document.getElementById('btnCheckout');
  
  console.log('🚀 INICIO procesarVenta() - Carrito:', JSON.stringify(carrito.map(i => ({id: i.idProducto, nombre: i.nombre, cant: i.cantidad}))));
  console.log('   ventaEnProceso:', ventaEnProceso);
  
  // ✅ PREVENIR EJECUCIÓN SI YA HAY UNA VENTA EN PROCESO
  if (ventaEnProceso) {
    console.log('⚠️ BLOQUEADO: Ya hay una venta en proceso');
    return;
  }
  
  if (carrito.length === 0) {
    console.log('❌ DETENIDO: Carrito vacío');
    mostrarError('El carrito está vacío');
    return;
  }

  // ✅ MARCAR COMO EN PROCESO
  ventaEnProceso = true;
  console.log('🔒 ventaEnProceso = true');

  // Deshabilitar botón para prevenir múltiples clics
  btnCheckout.disabled = true;

  // Validar stock antes de procesar
  console.log('🔍 Validando stock antes de procesar venta...');
  for (const item of carrito) {
    const producto = productos.find(p => p.idProducto === item.idProducto);
    
    if (!producto) {
      console.log(`   ❌ PRODUCTO NO ENCONTRADO EN ARRAY: ${item.nombre}`);
      mostrarError(`Producto ${item.nombre} no encontrado. Recarga la página.`);
      btnCheckout.disabled = false;
      ventaEnProceso = false;  // ✅ DESBLOQUEAR
      console.log('🔓 ventaEnProceso = false (producto no encontrado)');
      return;
    }
    
    const stockActual = parseInt(producto?.stockActual) || 0;
    
    console.log(`   Producto: ${item.nombre} - Solicitado: ${item.cantidad}, Stock: ${stockActual}`);
    
    if (item.cantidad > stockActual) {
      console.log(`   ❌ STOCK INSUFICIENTE: ${item.nombre}`);
      console.log(`   ❌ DETENIDO: NO se enviará la petición al servidor`);
      mostrarError(`❌ No hay suficiente stock para "${item.nombre}". Disponible: ${stockActual}, Solicitado: ${item.cantidad}`);
      btnCheckout.disabled = false;  // Re-habilitar botón
      ventaEnProceso = false;  // ✅ DESBLOQUEAR
      console.log('🔓 ventaEnProceso = false (stock insuficiente)');
      return; // ← Detener aquí, NO continuar con la venta
    }
  }
  
  console.log('✅ Validación de stock OK - Continuando con la venta...');

  // Calcular totales
  let subtotal = 0;
  let descuentos = 0;

  carrito.forEach(item => {
    const subtotalLinea = item.cantidad * item.precioUnitario;
    const descuentoLinea = (subtotalLinea * item.descuentoPct) / 100;
    subtotal += subtotalLinea;
    descuentos += descuentoLinea;
  });

  const total = subtotal - descuentos;

  // Preparar detalles de venta
  const detalles = carrito.map(item => ({
    idProducto: item.idProducto,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
    descuentoPct: item.descuentoPct || 0
  }));

  console.log('💳 Procesando venta:', {
    detalles,
    subtotal,
    descuentos,
    total
  });

  try {
    console.log('📡 ENVIANDO petición al servidor...', {
      url: window.API_VENTAS_CREAR,
      detalles: JSON.stringify(detalles, null, 2)
    });
    
    const response = await fetch(window.API_VENTAS_CREAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      body: JSON.stringify({
        detalles: detalles
      })
    });

    const data = await response.json();

    console.log('✅ Respuesta del servidor:', data);

    if (data.ok) {
      // Crear objeto de venta para el resumen
      const venta = {
        idVenta: data.idVenta,
        fecha: new Date().toISOString(),
        subtotal: subtotal,
        descuentos: descuentos,
        total: total,
        detalle: carrito.map(item => ({
          idProducto: item.idProducto,
          codigo: item.codigo,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          descuentoPct: item.descuentoPct
        }))
      };

      // Mostrar resumen de venta
      mostrarResumenVenta(venta);

      // Limpiar carrito y recargar productos
      carrito = [];
      
      // ✅ LIMPIAR FLAG DE ERROR AL PROCESAR VENTA EXITOSA
      errorStockDetectado = false;
      console.log(`✅ errorStockDetectado = false - VENTAS DESBLOQUEADAS`);
      
      actualizarCarrito();
      cargarProductosDesdeAPI(); // Recargar para actualizar stock
      mostrarNotificacion('Venta procesada correctamente');
      ventaEnProceso = false;  // ✅ DESBLOQUEAR
      console.log('🔓 ventaEnProceso = false (venta exitosa)');
      // No re-habilitar botón aquí porque el carrito estará vacío
    } else {
      console.error('❌ Error al procesar venta:', data.msg);
      mostrarError(data.msg || 'Error al procesar la venta');
      btnCheckout.disabled = false;  // Re-habilitar para reintentar
      ventaEnProceso = false;  // ✅ DESBLOQUEAR
      console.log('🔓 ventaEnProceso = false (error del servidor)');
    }
  } catch (error) {
    console.error('❌ Error al procesar venta:', error);
    mostrarError('Error de conexión al procesar la venta');
    btnCheckout.disabled = false;  // Re-habilitar para reintentar
    ventaEnProceso = false;  // ✅ DESBLOQUEAR
    console.log('🔓 ventaEnProceso = false (error de conexión)');
  }
}

function mostrarResumenVenta(venta) {
  console.log('📄 Mostrando ticket de venta:', venta);
  
  // Crear modal
  let modal = document.getElementById('modalTicket');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalTicket';
    modal.className = 'modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      backdrop-filter: blur(4px);
    `;
    document.body.appendChild(modal);
  }

  const fecha = new Date(venta.fecha);
  const fechaStr = fecha.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  modal.onclick = (e) => {
    if (e.target === modal) cerrarModalTicket();
  };

  modal.innerHTML = `
    <div style="
      max-width: 500px;
      width: 90%;
      background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
      border-radius: 18px;
      box-shadow: inset 0 0 0 2px rgba(255,255,255,0.25), 0 20px 50px rgba(0,0,0,0.7);
      padding: 32px;
      color: #fff;
      position: relative;
    ">
      <button onclick="cerrarModalTicket()" style="
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        font-size: 28px;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
        transition: color 0.15s ease;
      " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.6)'">&times;</button>

      <div style="text-align: center; margin-bottom: 24px;">
        <svg viewBox="0 0 24 24" width="48" height="48" style="color: #34d399; margin-bottom: 12px;">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">¡Venta Realizada!</h2>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">Venta #${venta.idVenta}</p>
        <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.6); font-size: 13px;">${fechaStr}</p>
      </div>

      <div style="
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 20px;
      ">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; opacity: 0.7;">Detalle</h3>
        ${venta.detalle.map(item => `
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          ">
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 14px;">${item.nombre}</div>
              <div style="font-size: 12px; color: rgba(255,255,255,0.6);">
                ${item.codigo} • ${item.cantidad} × Q ${item.precioUnitario.toFixed(2)}
                ${item.descuentoPct > 0 ? `<span style="color: #34d399;"> • -${item.descuentoPct}%</span>` : ''}
              </div>
            </div>
            <div style="font-weight: 700; font-size: 14px; text-align: right;">
              Q ${((item.cantidad * item.precioUnitario) * (1 - item.descuentoPct / 100)).toFixed(2)}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="
        background: rgba(52, 211, 153, 0.1);
        border: 1px solid rgba(52, 211, 153, 0.3);
        border-radius: 12px;
        padding: 16px;
      ">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
          <span>Subtotal:</span>
          <span>Q ${venta.subtotal.toFixed(2)}</span>
        </div>
        ${venta.descuentos > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #34d399;">
            <span>Descuentos:</span>
            <span>- Q ${venta.descuentos.toFixed(2)}</span>
          </div>
        ` : ''}
        <div style="
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(52, 211, 153, 0.3);
          font-size: 18px;
          font-weight: 700;
        ">
          <span>TOTAL:</span>
          <span style="color: #34d399;">Q ${venta.total.toFixed(2)}</span>
        </div>
      </div>

      <button onclick="cerrarModalTicket()" style="
        width: 100%;
        margin-top: 20px;
        padding: 14px 24px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 999px;
        color: #fff;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
      " onmouseover="this.style.background='rgba(255,255,255,0.15)'; this.style.borderColor='rgba(255,255,255,0.3)'" 
         onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,0.2)'">
        Cerrar
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function cerrarModalTicket() {
  const modal = document.getElementById('modalTicket');
  if (modal) {
    modal.style.display = 'none';
  }
}

function mostrarError(mensaje) {
  const notificacion = document.createElement('div');
  notificacion.className = 'notificacion';
  notificacion.style.position = 'fixed';
  notificacion.style.top = '24px';
  notificacion.style.right = '24px';
  notificacion.style.padding = '14px 24px';
  notificacion.style.background = 'rgba(255, 75, 47, 0.15)';
  notificacion.style.border = '1px solid rgba(255, 75, 47, 0.3)';
  notificacion.style.color = '#ff4b2f';
  notificacion.style.borderRadius = '999px';
  notificacion.style.fontWeight = '600';
  notificacion.style.fontSize = '14px';
  notificacion.style.zIndex = '2000';
  notificacion.style.opacity = '0';
  notificacion.style.transform = 'translateY(-20px)';
  notificacion.style.transition = 'all 0.3s ease';
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);

  setTimeout(() => notificacion.style.opacity = '1', 10);
  setTimeout(() => notificacion.style.transform = 'translateY(0)', 10);

  setTimeout(() => {
    notificacion.style.opacity = '0';
    notificacion.style.transform = 'translateY(-20px)';
    setTimeout(() => notificacion.remove(), 300);
  }, 3000);
}

function mostrarNotificacion(mensaje) {
  const notificacion = document.createElement('div');
  notificacion.style.position = 'fixed';
  notificacion.style.top = '24px';
  notificacion.style.right = '24px';
  notificacion.style.padding = '14px 24px';
  notificacion.style.background = 'rgba(52, 211, 153, 0.15)';
  notificacion.style.border = '1px solid rgba(52, 211, 153, 0.3)';
  notificacion.style.color = '#34d399';
  notificacion.style.borderRadius = '999px';
  notificacion.style.fontWeight = '600';
  notificacion.style.fontSize = '14px';
  notificacion.style.zIndex = '2000';
  notificacion.style.opacity = '0';
  notificacion.style.transform = 'translateY(-20px)';
  notificacion.style.transition = 'all 0.3s ease';
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);

  setTimeout(() => notificacion.style.opacity = '1', 10);
  setTimeout(() => notificacion.style.transform = 'translateY(0)', 10);

  setTimeout(() => {
    notificacion.style.opacity = '0';
    notificacion.style.transform = 'translateY(-20px)';
    setTimeout(() => notificacion.remove(), 300);
  }, 3000);
}


