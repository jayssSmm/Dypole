import http from 'http';

const PORT = process.env.PORT || 8000;

// Scenario states for mock server
let currentScenario = 'normal'; // 'normal' | 'blizzard'

const getStatusData = (scenario) => {
  if (scenario === 'blizzard') {
    return {
      severity: 'emergency',
      battery: {
        capacity_kwh: 540.0,
        usable_kwh: 432.0,
        current_kwh: 240.0,
        discharge_kw: 65.0,
      },
      diesel_health: 64,
      restock_days_remaining: 2,
    };
  }
  return {
    severity: 'normal',
    battery: {
      capacity_kwh: 540.0,
      usable_kwh: 432.0,
      current_kwh: 388.0,
      discharge_kw: 32.0,
    },
    diesel_health: 78,
    restock_days_remaining: 4,
  };
};

// 220 ± rand(0-10) kW for normal, 330 ± rand(0-10) kW for blizzard
const getScheduleData = (scenario) => {
  if (scenario === 'blizzard') {
    return [
      { hour: 0, diesel_kw: 220.0, solar_kw: 0.0, wind_kw: 48.0, battery_kw: 62.0, demand_kw: 330.0, battery_soc_after: 44.4, reason: "Katabatic blizzard: 68kt winds, zero solar PV, diesel genset #1 primary (220kW)" },
      { hour: 1, diesel_kw: 235.0, solar_kw: 0.0, wind_kw: 35.0, battery_kw: 68.0, demand_kw: 338.0, battery_soc_after: 39.2, reason: "Diesel ramp-up to support station heating coils and life-support circuits" },
      { hour: 2, diesel_kw: 240.0, solar_kw: 0.0, wind_kw: 28.0, battery_kw: 66.0, demand_kw: 334.0, battery_soc_after: 34.1, reason: "Peak blizzard heating load; BESS buffer discharging within thermal limit" },
      { hour: 3, diesel_kw: 245.0, solar_kw: 0.0, wind_kw: 32.0, battery_kw: 52.0, demand_kw: 329.0, battery_soc_after: 30.2, reason: "Full diesel generation dispatch; BESS discharge modulated to preserve cell life" },
      { hour: 4, diesel_kw: 230.0, solar_kw: 0.0, wind_kw: 45.0, battery_kw: 50.0, demand_kw: 325.0, battery_soc_after: 26.5, reason: "Wind speed fluctuating between 55-75 kt; turbine pitch feathering active" },
      { hour: 5, diesel_kw: 225.0, solar_kw: 0.0, wind_kw: 58.0, battery_kw: 48.0, demand_kw: 331.0, battery_soc_after: 23.0, reason: "Turbine generator #2 re-engaged on microgrid bus" },
      { hour: 6, diesel_kw: 215.0, solar_kw: 0.0, wind_kw: 72.0, battery_kw: 40.0, demand_kw: 327.0, battery_soc_after: 20.2, reason: "Wind generation recovering; diesel throttling down to baseline" },
      { hour: 7, diesel_kw: 200.0, solar_kw: 0.0, wind_kw: 88.0, battery_kw: 34.0, demand_kw: 322.0, battery_soc_after: 19.5, reason: "Wind gust stability improving; BESS float discharge reduced" },
      { hour: 8, diesel_kw: 185.0, solar_kw: 0.0, wind_kw: 110.0, battery_kw: 32.0, demand_kw: 327.0, battery_soc_after: 21.0, reason: "Wind-diesel hybrid balancing active; emergency reserve preserved" },
      { hour: 9, diesel_kw: 165.0, solar_kw: 5.0, wind_kw: 132.0, battery_kw: 28.0, demand_kw: 330.0, battery_soc_after: 23.5, reason: "Renewable penetration increasing to 50% as blizzard eye passes" },
      { hour: 10, diesel_kw: 140.0, solar_kw: 12.0, wind_kw: 154.0, battery_kw: 26.0, demand_kw: 332.0, battery_soc_after: 27.0, reason: "Diesel gen transitioned to partial-load backup state" },
      { hour: 11, diesel_kw: 110.0, solar_kw: 22.0, wind_kw: 175.0, battery_kw: 20.0, demand_kw: 327.0, battery_soc_after: 31.0, reason: "Microgrid stabilized; blizzard emergency warning downgrade in progress" },
    ];
  }

  return [
    { hour: 0, diesel_kw: 0.0, solar_kw: 95.0, wind_kw: 124.0, battery_kw: 0.0, demand_kw: 219.0, battery_soc_after: 72.5, reason: "Solar (95kW) and Wind (124kW) fully cover 219kW station demand; zero-diesel maintained" },
    { hour: 1, diesel_kw: 0.0, solar_kw: 108.0, wind_kw: 118.0, battery_kw: 0.0, demand_kw: 224.0, battery_soc_after: 75.0, reason: "Surplus renewable generation (+2kW) routed to BESS storage charging buffer" },
    { hour: 2, diesel_kw: 0.0, solar_kw: 122.0, wind_kw: 105.0, battery_kw: 0.0, demand_kw: 226.0, battery_soc_after: 77.8, reason: "Solar irradiance peak (122kW); zero-diesel baseline fully sustained" },
    { hour: 3, diesel_kw: 0.0, solar_kw: 128.0, wind_kw: 98.0, battery_kw: 0.0, demand_kw: 222.0, battery_soc_after: 80.5, reason: "High solar yield; station life-support and laboratories on 100% clean power" },
    { hour: 4, diesel_kw: 0.0, solar_kw: 116.0, wind_kw: 102.0, battery_kw: 0.0, demand_kw: 218.0, battery_soc_after: 82.0, reason: "Solar and wind generation balancing HVAC and deep-ice scientific sensor arrays" },
    { hour: 5, diesel_kw: 0.0, solar_kw: 96.0, wind_kw: 121.0, battery_kw: 0.0, demand_kw: 217.0, battery_soc_after: 82.5, reason: "Katabatic wind pickup offsetting solar elevation decline; BESS saturated" },
    { hour: 6, diesel_kw: 0.0, solar_kw: 68.0, wind_kw: 132.0, battery_kw: 22.0, demand_kw: 222.0, battery_soc_after: 80.0, reason: "BESS micro-discharge (22kW) smoothing dusk transition" },
    { hour: 7, diesel_kw: 0.0, solar_kw: 38.0, wind_kw: 145.0, battery_kw: 38.0, demand_kw: 221.0, battery_soc_after: 76.5, reason: "Battery buffer and wind balancing low-horizon solar angle" },
    { hour: 8, diesel_kw: 0.0, solar_kw: 12.0, wind_kw: 158.0, battery_kw: 55.0, demand_kw: 225.0, battery_soc_after: 71.0, reason: "Wind turbine generation maintaining primary grid bus frequency (50.02 Hz)" },
    { hour: 9, diesel_kw: 15.0, solar_kw: 0.0, wind_kw: 146.0, battery_kw: 62.0, demand_kw: 223.0, battery_soc_after: 66.0, reason: "Diesel generator standby warm-up (15kW); minimal dispatch for voltage support" },
    { hour: 10, diesel_kw: 22.0, solar_kw: 0.0, wind_kw: 138.0, battery_kw: 58.0, demand_kw: 218.0, battery_soc_after: 61.5, reason: "Night cycle power balance maintained within optimal diesel efficiency envelope" },
    { hour: 11, diesel_kw: 10.0, solar_kw: 24.0, wind_kw: 142.0, battery_kw: 45.0, demand_kw: 221.0, battery_soc_after: 58.0, reason: "Dawn solar emergence; diesel throttle back sequence initiated" },
  ];
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Scenario toggle endpoint for convenience
  if (url.pathname === '/scenario' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (parsed.scenario) {
          currentScenario = parsed.scenario;
        }
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ currentScenario }));
    });
    return;
  }

  if (url.pathname === '/status') {
    const data = getStatusData(currentScenario);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  if (url.pathname === '/schedule') {
    const data = getScheduleData(currentScenario);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found', available: ['/status', '/schedule'] }));
});

server.listen(PORT, () => {
  console.log(`📡 Polar Station Mock API Server listening on http://localhost:${PORT}`);
  console.log(`   GET http://localhost:${PORT}/status`);
  console.log(`   GET http://localhost:${PORT}/schedule`);
});
