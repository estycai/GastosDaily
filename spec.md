# Especificación del Proyecto: Gastos Daily (Smart Daily Budget)

## 1. Visión General y Propósito
**Gastos Daily** es una aplicación web *Mobile-First* (PWA / pensada para smartphones) diseñada para evitar el descontrol financiero mensual (el clásico problema de ahorrar los primeros días y gastar desmedidamente al tercer día).

La premisa es simple: fijar un presupuesto mensual/periódico (ej. `$300.000`) y una fecha de cierre de ciclo o tarjeta (ej. `30 de Septiembre`), permitiendo al usuario saber con exactitud **cuánto puede gastar hoy**, recalculando su cuota diaria automáticamente en base a su comportamiento real.

---

## 2. Regla de Negocio Central (Fórmula Dinámica)

$$\text{Disponible Hoy} = \frac{\text{Límite Total del Ciclo} - \sum \text{Gastos Registrados en el Ciclo}}{\text{Días Restantes hasta la Fecha de Cierre}}$$

### Reglas de cálculo:
1. **Días Restantes**: Se cuentan a partir del día de hoy inclusive hasta la medianoche del día de cierre.
2. **Efecto Ahorro**: Si hoy gastas menos de la cuota diaria, el remanente se distribuye equitativamente en los días futuros, incrementando tu disponible diario para mañana.
3. **Efecto Exceso**: Si hoy gastas más de la cuota, el sistema recalcula reduciendo las cuotas futuras de manera balanceada para no exceder el presupuesto total del ciclo.
4. **Alerta de Ritmo**:
   - `Verde`: Consumo del día <= Cuota diaria sugerida.
   - `Naranja/Rojo`: Consumo del día > Cuota diaria sugerida (sobregiro diario).

---

## 3. Funcionalidades Principales

### 3.1. Dashboard Principal (Home)
* **Hero Metric ("Podés Gastar Hoy")**:
  - Saldo disponible diario con visualización de gran tamaño (ej. `$ 10.000`).
  - Badge de ritmo: *"✓ Dentro del ritmo planeado"* o *"⚠️ Superaste el límite sugerido hoy"*.
* **Resumen del Ciclo (KPIs)**:
  - **Disponible Total**: Monto restante del ciclo (ej. `$ 100.000` de `$ 300.000`).
  - **Días Restantes**: Días que faltan para el cierre (ej. `10 días • Cierre: 30 Sep`).
  - **Barra de Progreso**: Porcentaje del presupuesto total consumido con código de color.
* **Feed de Gastos Recientes (Hoy)**:
  - Listado de movimientos del día con emoji de categoría, detalle, hora e importe.
* **Acceso Rápido**:
  - Botón CTA principal: `+ REGISTRAR GASTO HOY` accesible en zona ergonómica del pulgar.

### 3.2. Flujo de Registro de Gasto (Modal / Vista Mobile)
* **Ingreso de Monto**:
  - Visor amplio con formato de moneda.
  - Teclado numérico táctil (Numpad) para carga ágil sin fricción en mobile.
  - Feedback en vivo: *"Te quedarían $ X para hoy"*.
* **Concepto / Detalle**: Campo de texto opcional (ej. "Café con tostadas", "Nafta").
* **Categorías Rápidas**: Acceso de un toque a categorías frecuentes (Comida, Súper, Viaje, Varios, Servicios).
* **Simulador de Impacto**: Muestra al instante el nuevo límite diario calculado para los días restantes si se confirma el gasto.

### 3.3. Configuración y Ajustes del Ciclo
* **Presupuesto Asignado**: Límite mensual a proteger (ej. `$ 300.000`).
* **Fecha de Cierre**: Día de corte de la tarjeta o fin de mes.
* **Modo de Cálculo**: Opción de recálculo dinámico con traspaso de saldo vs. cuota fija por día.

---

## 4. Arquitectura y Stack Tecnológico

### Frontend:
* **Framework**: React (Vite) + TypeScript.
* **Estilos**: Tailwind CSS con paleta Dark Mode acorde al diseño de OpenPencil.
* **Íconos**: Lucide React.
* **PWA**: Soporte de Progressive Web App (manifest + service worker) para instalar como aplicación nativa en iPhone / Android.

### Backend y Base de Datos:
* **BaaS Principal**: **Supabase**.
  - **PostgreSQL**: Persistencia relacional, triggers y constraints.
  - **Supabase Auth**: Autenticación de usuario (magic link, email/password o OAuth).
  - **Row Level Security (RLS)**: Políticas de seguridad a nivel de fila para aislar los datos de cada usuario.
  - **Cliente Directo**: Conexión vía `@supabase/supabase-js` directamente desde el cliente React para máxima velocidad y simplicidad sin servidor intermedio.
  - **API Backend opcional**: Si se requiere backend dedicado (procesamiento en segundo plano o webhooks), se recomienda Node.js (Fastify / Express) o Supabase Edge Functions (Deno / TypeScript).

---

## 5. Modelo de Base de Datos (PostgreSQL / Supabase)

```sql
-- 1. Tabla de Ciclos de Gasto
create table public.cycles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  total_budget numeric(12, 2) not null check (total_budget > 0),
  start_date date not null default current_date,
  end_date date not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabla de Gastos
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  cycle_id uuid references public.cycles(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  concept text,
  category text not null default 'varios',
  expense_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.cycles enable row level security;
alter table public.expenses enable row level security;

-- Políticas de seguridad para que cada usuario solo acceda a lo suyo
create policy "Users can manage their own cycles"
  on public.cycles for all
  using (auth.uid() = user_id);

create policy "Users can manage their own expenses"
  on public.expenses for all
  using (auth.uid() = user_id);
```

---

## 6. Siguientes Pasos
1. Inicializar el proyecto React + Vite + TypeScript.
2. Configurar Tailwind CSS con los tokens y colores definidos en OpenPencil.
3. Crear el servicio de cálculo del presupuesto diario (`budgetCalculator.ts`).
4. Implementar los componentes de interfaz (Dashboard, Numpad Modal, Settings).
5. Conectar el cliente de Supabase.
