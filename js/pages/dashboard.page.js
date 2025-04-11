import { basePath } from "../main.js";

window.currentDataSource = "live";

export const DashboardPage = {
  show() {
    document.getElementById("dashboard").style.display = "block";

    const logoutLink = document.getElementById("logout-link");
    if (logoutLink) {
      logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        DashboardPage.hide();
        const selectorWrapper = document.getElementById("data-source-selector");
        if (selectorWrapper) selectorWrapper.style.display = "none";
        document.getElementById("login-page").style.display = "block";
        document.getElementById("password").value = "";
      });
    }

    const dataSourceSelector = document.getElementById("data-source");
    const selectorWrapper = document.getElementById("data-source-selector");
    if (dataSourceSelector && selectorWrapper) {
      selectorWrapper.style.display = "block";
      dataSourceSelector.addEventListener("change", (e) => {
        window.currentDataSource = e.target.value;

        const gaugeEl = document.getElementById("main");
        const chartEl = document.getElementById("line-chart");
        if (gaugeEl && echarts.getInstanceByDom(gaugeEl)) {
          echarts.dispose(gaugeEl);
        }
        if (chartEl && echarts.getInstanceByDom(chartEl)) {
          echarts.dispose(chartEl);
        }

        DashboardPage.loadWeather();
      });
    }
  },

  hide() {
    document.getElementById("dashboard").style.display = "none";
  },

  loadWeather() {
    console.log("🌐 Loading weather data...");

    const apiUrl =
      window.currentDataSource === "live"
        ? "https://api.met.no/weatherapi/locationforecast/2.0/classic?altitude=30&lat=58.91&lon=5.72"
        : `${basePath}${window.currentDataSource}`;

    fetch(apiUrl, {
      headers:
        window.currentDataSource === "live"
          ? { "User-Agent": "KontorTemp/1.0 contact@example.com" }
          : {},
    })
      .then((res) => res.text())
      .then((xml) => {
        console.log("✅ Weather data fetched and parsed successfully.");
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "application/xml");

        DashboardPage.renderGauge(xmlDoc);
        DashboardPage.renderChart(xmlDoc);
        DashboardPage.renderIcon(xmlDoc);
        DashboardPage.recommendCoffeeBreak(xmlDoc);
      })
      .catch((err) => {
        console.error("❌ Weather fetch or processing failed:", err);
      });
  },

  setAccessLevel(access) {
    const selectorWrapper = document.getElementById("data-source-selector");
    if (selectorWrapper) {
      selectorWrapper.style.display = access === "admin" ? "block" : "none";
    }
  },

  recommendCoffeeBreak(xmlDoc) {
    const firstTime = xmlDoc.querySelector("time[from][to]");
    const baseDate = firstTime
      ? new Date(firstTime.getAttribute("from")).toISOString().split("T")[0]
      : null;
    const timeElements = Array.from(xmlDoc.querySelectorAll("time"));
    const hourlyData = new Map();
    const symbolMap = new Map();

    timeElements.forEach((t) => {
      const from = t.getAttribute("from");
      const to = t.getAttribute("to");
      const isSameHour = from === to;
      const date = new Date(from);
      const hour = date.getHours();
      const key = from;

      const location = t.querySelector("location");
      if (!location) return;

      const tempEl = location.querySelector("temperature");
      const windEl = location.querySelector("windSpeed");
      const symbolEl = location.querySelector("symbol");

      if (symbolEl) {
        symbolMap.set(to, symbolEl.getAttribute("code"));
      }

      if (
        isSameHour &&
        (!baseDate || from.startsWith(baseDate)) &&
        hour >= 9 &&
        hour <= 15
      ) {
        const existing = hourlyData.get(key) || {};
        if (tempEl) existing.temp = parseFloat(tempEl.getAttribute("value"));
        if (windEl) existing.wind = parseFloat(windEl.getAttribute("mps"));
        hourlyData.set(key, existing);
      }
    });

    for (const [key, data] of hourlyData.entries()) {
      if (!data.symbol && symbolMap.has(key)) {
        data.symbol = symbolMap.get(key);
      }
    }

    const candidates = [];
    let bestCandidate = null;

    for (const [timestamp, data] of hourlyData.entries()) {
      const date = new Date(timestamp);
      const timeStr = date.toLocaleTimeString("nb-NO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const temp = data.temp;
      const wind = data.wind;
      const symbol = data.symbol;

      if (temp === undefined || wind === undefined || !symbol) continue;

      const isSunny =
        symbol.includes("clearsky") ||
        symbol.includes("fair") ||
        symbol.includes("partlycloudy");

      const reasons = [];

      // Adaptive thresholds
      const minTemp = isSunny ? 8 : 10;
      const maxWind = isSunny ? 4.5 : 3.5;

      if (!isSunny) reasons.push("det er ikke solrikt");
      if (temp < minTemp)
        reasons.push(`det er for kaldt (${temp.toFixed(1)}°C)`);
      if (wind > maxWind)
        reasons.push(`vinden er for sterk (${wind.toFixed(1)} m/s)`);

      candidates.push({ time: timeStr, temp, wind, isSunny, reasons });

      if (
        reasons.length === 0 &&
        (!bestCandidate || temp > bestCandidate.temp)
      ) {
        bestCandidate = { time: timeStr, temp, wind, isSunny };
      }
    }

    const box = document.getElementById("coffee-recommendation");
    const msg = document.getElementById("coffee-message");
    const exp = document.getElementById("coffee-explanation");

    if (!box || !msg || !exp) {
      console.warn("⛔ Missing DOM elements for coffee recommendation.");
      return;
    }

    box.style.display = "block";

    if (bestCandidate) {
      msg.innerHTML = `😎 Anbefalt kaffepause ute kl. <strong>${bestCandidate.time}</strong>`;
      exp.textContent = `${
        bestCandidate.time
      } har behagelig temperatur på ${bestCandidate.temp.toFixed(
        1
      )}°C, lav vind og solrikt vær.`;
      console.log(
        `✅ Best recommendation: ${
          bestCandidate.time
        }, ${bestCandidate.temp.toFixed(1)}°C`
      );
    } else {
      if (candidates.length > 0) {
        const fallback = candidates.sort((a, b) => {
          if (a.reasons.length === b.reasons.length) {
            return b.temp - a.temp; // prefer warmer candidate
          }
          return a.reasons.length - b.reasons.length;
        })[0];

        const firstFallback = fallback;
        const tempDesc =
          firstFallback.temp < 5
            ? "iskaldt"
            : firstFallback.temp < 10
            ? "kaldt"
            : "svalt";
        const windDesc =
          firstFallback.wind > 5
            ? "kraftig vind"
            : firstFallback.wind > 3
            ? "litt vind"
            : "stille";
        const sunnyDesc = firstFallback.isSunny ? "solrikt" : "overskyet";
        msg.textContent = `☁️ ${tempDesc}, ${windDesc}, ${sunnyDesc} – ta kaffen innendørs.`;
        const reasonsText = fallback.reasons.join(" og ");
        exp.textContent = `${fallback.time} er det beste tidspunktet, men ${reasonsText}.`;
      } else {
        msg.textContent = `☁️ Dårlig vær i dag. Ta kaffen innendørs.`;
        exp.textContent = `Ingen gyldige værdata tilgjengelig for i dag.`;
      }
      console.log("❌ No suitable time for coffee break today.");
      console.log("👀 Number of candidates:", candidates.length);
    }
  },

  renderGauge(xmlDoc) {
    const tempEl = xmlDoc.querySelector("location > temperature");
    const temp = tempEl ? parseFloat(tempEl.getAttribute("value")) : 0;

    const mainChartEl = document.getElementById("main");
    if (!mainChartEl) {
      console.warn("⛔ Missing #main for gauge chart");
      return;
    }
    if (echarts.getInstanceByDom(mainChartEl)) {
      echarts.dispose(mainChartEl);
    }
    const chart = echarts.init(mainChartEl);

    chart.setOption({
      series: [
        {
          type: "gauge",
          center: ["50%", "60%"],
          startAngle: 200,
          endAngle: -20,
          min: -15,
          max: 35,
          progress: { show: true, width: 30 },
          itemStyle: { color: "#FFAB91" },
          pointer: { show: false },
          axisLine: { lineStyle: { width: 30 } },
          axisTick: {
            distance: -45,
            splitNumber: 5,
            lineStyle: { width: 2, color: "#999" },
          },
          splitLine: {
            distance: -52,
            length: 14,
            lineStyle: { width: 3, color: "#999" },
          },
          axisLabel: { distance: -20, color: "#999", fontSize: 20 },
          title: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 60,
            formatter: "{value} °C",
          },
          data: [{ value: temp }],
        },
      ],
    });
  },

  renderChart(xmlDoc) {
    // Determine base date from first <time> entry
    const firstTime = xmlDoc.querySelector("time[from][to]");
    const baseDate = firstTime
      ? new Date(firstTime.getAttribute("from")).toISOString().split("T")[0]
      : null;

    const points = Array.from(xmlDoc.querySelectorAll("time"))
      .filter((el) => el.getAttribute("from") === el.getAttribute("to"))
      .filter((el) => {
        const fromDate = new Date(el.getAttribute("from"));
        const hour = fromDate.getHours();
        const dateStr = fromDate.toISOString().split("T")[0];
        return hour >= 7 && hour <= 17 && (!baseDate || dateStr === baseDate);
      });

    const temps = points.map((el) =>
      parseFloat(
        el.querySelector("location > temperature")?.getAttribute("value") || 0
      )
    );
    const labels = points.map((el) => {
      const date = new Date(el.getAttribute("from"));
      return date.toLocaleTimeString("nb-NO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    });

    const lineChartEl = document.getElementById("line-chart");
    if (!lineChartEl) {
      console.warn("⛔ Missing #line-chart for temperature chart");
      return;
    }
    if (echarts.getInstanceByDom(lineChartEl)) {
      echarts.dispose(lineChartEl);
    }
    const chart = echarts.init(lineChartEl);

    chart.setOption({
      color: ["#80FFA5"],
      title: { text: "Dagens temperatur", left: "center" },
      tooltip: { trigger: "axis" },
      xAxis: [{ type: "category", boundaryGap: false, data: labels }],
      yAxis: [{ type: "value" }],
      series: [
        {
          name: "Temperatur",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 0 },
          areaStyle: {
            opacity: 0.8,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgb(128, 255, 165)" },
              { offset: 1, color: "rgb(1, 191, 236)" },
            ]),
          },
          data: temps,
        },
      ],
    });
  },

  renderIcon(xmlDoc) {
    const symbol = xmlDoc.querySelector("symbol");
    const wind = xmlDoc.querySelector("windSpeed");
    const windSpeed = wind?.getAttribute("mps");
    const windName = wind?.getAttribute("name");

    const code = symbol?.getAttribute("code");

    if (windSpeed && windName) {
      const windFormatted = parseFloat(windSpeed).toFixed(1).replace(".", ",");
      document.getElementById(
        "wind-info"
      ).textContent = `${windFormatted} m/s – ${windName}`;
    }

    if (code) {
      document.getElementById(
        "weather-icon"
      ).src = `graphic/weather/svg/${code}.svg`;
    }
  },

  loadMenuIfAuthorized(accessLevel) {
    const menuContainer = document.getElementById("menu-of-the-day");
    menuContainer.classList.add("d-none"); // Hide initially

    fetch("https://i74qu6dp3m.execute-api.us-east-2.amazonaws.com/")
      .then((res) => res.json())
      .then((data) => {
        const today = new Date().toLocaleDateString("no-NO", {
          weekday: "long",
        });
        const todayData = data.days.find(
          (d) => d.day.toLowerCase() === today.toLowerCase()
        );

        if (todayData) {
          const menuList = document.getElementById("menu-list");
          menuList.innerHTML = ""; // Clear existing

          const varmrett = todayData.dishes.find((d) =>
            d.toLowerCase().startsWith("varmrett")
          );
          const suppe = todayData.dishes.find((d) =>
            d.toLowerCase().startsWith("suppe")
          );

          if (varmrett) {
            const li = document.createElement("li");
            li.className = "list-group-item";
            li.textContent = varmrett;
            menuList.appendChild(li);
          }

          if (suppe) {
            const li = document.createElement("li");
            li.className = "list-group-item";
            li.textContent = suppe;
            menuList.appendChild(li);
          }

          menuContainer.classList.remove("d-none");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch today's menu:", err);
      });
  },
};
