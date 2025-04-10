export const DashboardPage = {
  show() {
    document.getElementById("dashboard").style.display = "block";

    document.getElementById("logout-button").addEventListener("click", () => {
      DashboardPage.hide();
      document.getElementById("login-page").style.display = "block";
      document.getElementById("password").value = "";
    });
  },

  hide() {
    document.getElementById("dashboard").style.display = "none";
  },

  loadWeather() {
    const apiUrl =
      "https://api.met.no/weatherapi/locationforecast/2.0/classic?altitude=30&lat=58.91&lon=5.72";

    fetch(apiUrl, {
      headers: {
        "User-Agent": "KontorTemp/1.0",
      },
    })
      .then((res) => res.text())
      .then((xml) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "application/xml");

        DashboardPage.renderGauge(xmlDoc);
        DashboardPage.renderChart(xmlDoc);
        DashboardPage.renderIcon(xmlDoc);
        DashboardPage.recommendCoffeeBreak(xmlDoc);
      })
      .catch((err) => console.error("Weather fetch failed:", err));
  },

  recommendCoffeeBreak(xmlDoc) {
    const today = new Date().toISOString().split("T")[0];
    const timeElements = Array.from(xmlDoc.querySelectorAll("time"));
    let bestHour = null;

    console.log("🔍 Checking conditions for coffee break...");

    timeElements.forEach((t) => {
      const from = t.getAttribute("from");
      const to = t.getAttribute("to");
      const date = new Date(from);
      const hour = date.getHours();
      const isToday = from.startsWith(today);
      const isSameHour = from === to;

      const tempEl = t.querySelector("temperature");
      const windEl = t.querySelector("windSpeed");
      const symbolEl = t.querySelector("symbol");

      if (
        isToday &&
        isSameHour &&
        hour >= 7 &&
        hour <= 17 &&
        tempEl &&
        windEl &&
        symbolEl
      ) {
        const temp = parseFloat(tempEl.getAttribute("value"));
        const wind = parseFloat(windEl.getAttribute("mps"));
        const condition = symbolEl.getAttribute("code");

        const isSunny =
          condition &&
          (condition.includes("clearsky") ||
            condition.includes("fair") ||
            condition.includes("partlycloudy"));
        const timeStr = date.toLocaleTimeString("nb-NO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        console.log(
          `🕒 ${timeStr} — temp: ${temp}°C, wind: ${wind} m/s, symbol: ${condition}`
        );
        if (!isSunny) console.log("   ⛔ Not sunny");
        if (temp <= 12) console.log("   ⛔ Temperature not above 12°C");
        if (wind > 3) console.log("   ⛔ Wind too strong");

        if (isSunny && temp > 12 && wind <= 3) {
          if (!bestHour || temp > bestHour.temp) {
            bestHour = {
              time: timeStr,
              temp,
            };
          }
        }
      }
    });

    const box = document.getElementById("coffee-recommendation");
    if (bestHour) {
      box.innerHTML = `😎 Anbefalt kaffepause ute kl. <strong>${bestHour.time}</strong>`;
      box.style.display = "block";
      console.log(
        `✅ Best recommendation: ${bestHour.time}, ${bestHour.temp}°C`
      );
    } else {
      box.style.display = "none";
      console.log("❌ No suitable time for coffee break today.");
    }
  },

  renderGauge(xmlDoc) {
    const tempEl = xmlDoc.querySelector("location > temperature");
    const temp = tempEl ? parseFloat(tempEl.getAttribute("value")) : 0;

    const chart = echarts.init(document.getElementById("main"));
    chart.setOption({
      series: [
        {
          type: "gauge",
          center: ["50%", "60%"],
          startAngle: 200,
          endAngle: -20,
          min: -30,
          max: 30,
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
    const today = new Date().toISOString().split("T")[0];
    const points = Array.from(xmlDoc.querySelectorAll("time"))
      .filter((el) => el.getAttribute("from") === el.getAttribute("to"))
      .filter((el) => el.getAttribute("from").startsWith(today))
      .filter((el) => {
        const hour = new Date(el.getAttribute("from")).getHours();
        return hour >= 7 && hour <= 17;
      });

    const temps = points.map((el) =>
      parseFloat(el.querySelector("temperature")?.getAttribute("value") || 0)
    );
    const labels = points.map((el) => {
      const date = new Date(el.getAttribute("from"));
      return date.toLocaleTimeString("nb-NO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    });

    const chart = echarts.init(document.getElementById("line-chart"));
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

  setAccessLevel(access) {
    const accessInfo = document.getElementById("access-level-info");
    accessInfo.textContent = `Access level: ${access.toUpperCase()}`;

    // Optional: unlock features based on access
    if (access === "admin") {
      // Show advanced settings or debug info
    } else if (access === "level3") {
      // Show medium access content
    }
    // etc...
  },

  loadMenuIfAuthorized(accessLevel) {
    const menuContainer = document.getElementById("menu-of-the-day");
    menuContainer.classList.add("d-none"); // Hide initially

    const allowedAccess = ["1", "2", "admin"];
    if (!allowedAccess.includes(accessLevel)) return;

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
