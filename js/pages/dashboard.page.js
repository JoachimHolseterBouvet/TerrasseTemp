import { basePath } from "../main.js";

export const DashboardPage = {
  show() {
    const dashboard = document.getElementById("dashboard");
    if (!dashboard) {
      console.error("Dashboard element not found");
      return;
    }
    dashboard.style.display = "block";

    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
      // Remove existing listener to prevent duplicates
      logoutButton.removeEventListener("click", handleLogout);
      logoutButton.addEventListener("click", handleLogout);
    } else {
      console.warn("Logout button not found");
    }

    function handleLogout() {
      DashboardPage.hide();
      const loginPage = document.getElementById("login-page");
      const passwordField = document.getElementById("password");
      if (loginPage) loginPage.style.display = "block";
      if (passwordField) passwordField.value = "";
    }
  },

  hide() {
    const dashboard = document.getElementById("dashboard");
    if (dashboard) {
      dashboard.style.display = "none";
    } else {
      console.warn("Dashboard element not found to hide");
    }
  },

  loadWeather() {
    const apiUrl =
      "https://api.met.no/weatherapi/locationforecast/2.0/classic?altitude=30&lat=58.91&lon=5.72";

    fetch(apiUrl, {
      headers: {
        "User-Agent": "KontorTemp/1.0 (+https://example.com)",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.text();
      })
      .then((xml) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "application/xml");
        if (xmlDoc.querySelector("parsererror")) {
          throw new Error("Invalid XML received");
        }
        DashboardPage.renderGauge(xmlDoc);
        DashboardPage.renderChart(xmlDoc);
        DashboardPage.renderIcon(xmlDoc);
        DashboardPage.recommendCoffeeBreak(xmlDoc);
      })
      .catch((err) => {
        console.error("Weather fetch failed:", err);
        const coffeeMessage = document.getElementById("coffee-message");
        if (coffeeMessage) {
          coffeeMessage.textContent = "Could not load weather data";
        }
      });
  },

  recommendCoffeeBreak(xmlDoc) {
    console.log("📦 Starting coffee break recommendation");
    const today = new Date().toISOString().split("T")[0];
    const timeElements = Array.from(xmlDoc.querySelectorAll("time"));
    console.log("📆 Time elements found:", timeElements.length);
    let bestCandidate = null;
    let bestScore = -Infinity;
    let rainCounter = 0;
    let totalConsidered = 0;

    const coffeeMessage = document.getElementById("coffee-message");
    const coffeeExplanation = document.getElementById("coffee-explanation");
    const box = document.getElementById("coffee-recommendation");

    if (!coffeeMessage || !coffeeExplanation || !box) {
      console.error("Coffee recommendation elements missing");
      return;
    }

    function scoreCandidate(temp, wind, isSunny) {
      let score = temp;
      if (isSunny) score += 5;
      score -= wind * 2;
      return score;
    }

    timeElements.forEach((t) => {
      const from = t.getAttribute("from");
      const to = t.getAttribute("to");
      const date = new Date(from);
      const hour = date.getHours();
      const isToday = from.startsWith(today);
      const isSameHour = from === to;

      if (isToday && isSameHour && hour >= 9 && hour <= 15) {
        console.log(t.outerHTML);
        console.log(`⏰ Checking ${from} (${hour}h)`);
        const location = t.querySelector("location");
        if (!location) return;

        const tempEl = location.querySelector("temperature");
        const windEl = location.querySelector("windSpeed");
        const symbolEl = location.querySelector("symbol");

        if (tempEl && windEl) {
          console.log("✔️ Valid data for hour:", { tempEl, windEl, symbolEl });
          const temp = parseFloat(tempEl.getAttribute("value") || "0");
          const wind = parseFloat(windEl.getAttribute("mps") || "0");
          const condition =
            symbolEl?.getAttribute("code")?.toLowerCase() || "cloudy";
          const isSunny =
            condition.includes("clearsky") ||
            condition.includes("fair") ||
            condition.includes("partlycloudy");

          totalConsidered++;
          if (condition.includes("rain")) {
            rainCounter++;
          }

          const timeStr = date.toLocaleTimeString("nb-NO", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

          const score = scoreCandidate(temp, wind, isSunny);
          if (score > bestScore) {
            bestScore = score;
            bestCandidate = {
              time: timeStr,
              temp,
              wind,
              isSunny,
              score,
              condition,
              cloudiness: parseFloat(
                location.querySelector("cloudiness")?.getAttribute("percent") ||
                  "0"
              ),
            };
          }
        } else {
          console.warn("Missing temperature or wind data for", from);
        }
      }
    });

    const rainAllDay = totalConsidered > 0 && rainCounter === totalConsidered;

    if (rainAllDay) {
      coffeeMessage.innerHTML = `🌧️ Regn hele dagen, ta kaffepausen inne ☕`;
      coffeeExplanation.textContent = "";
    } else if (bestCandidate) {
      const isTooCloudy = bestCandidate.cloudiness >= 95;
      if (isTooCloudy) {
        coffeeMessage.innerHTML = `☁️ Anbefaler ikke kaffepause ute i dag.`;
      } else {
        coffeeMessage.innerHTML = `😎 Anbefalt kaffepause ute kl. <strong>${bestCandidate.time}</strong>`;
      }
      coffeeExplanation.textContent = `${
        bestCandidate.time
      } vurderes som best med temperatur på ${bestCandidate.temp}°C, vind på ${
        bestCandidate.wind
      } m/s (score: ${bestCandidate.score.toFixed(1)}).`;
    } else {
      coffeeMessage.textContent = "No suitable coffee break time found";
      coffeeExplanation.textContent = "";
    }
    box.style.display = "block";
  },

  renderGauge(xmlDoc) {
    const main = document.getElementById("main");
    if (!main) {
      console.error("Chart container 'main' not found");
      return;
    }
    if (typeof echarts === "undefined") {
      console.error("ECharts library not loaded");
      return;
    }

    const tempEl = xmlDoc.querySelector("location > temperature");
    const temp = tempEl ? parseFloat(tempEl.getAttribute("value") || "0") : 0;

    const chart = echarts.init(main);
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
    const lineChart = document.getElementById("line-chart");
    if (!lineChart) {
      console.error("Chart container 'line-chart' not found");
      return;
    }
    if (typeof echarts === "undefined") {
      console.error("ECharts library not loaded");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const points = Array.from(xmlDoc.querySelectorAll("time"))
      .filter((el) => el.getAttribute("from") === el.getAttribute("to"))
      .filter((el) => el.getAttribute("from").startsWith(today))
      .filter((el) => {
        const hour = new Date(el.getAttribute("from")).getHours();
        return hour >= 7 && hour <= 17;
      });

    const temps = points.map((el) =>
      parseFloat(el.querySelector("temperature")?.getAttribute("value") || "0")
    );
    const labels = points.map((el) => {
      const date = new Date(el.getAttribute("from"));
      return date.toLocaleTimeString("nb-NO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    });

    const chart = echarts.init(lineChart);
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
    const weatherIcon = document.getElementById("weather-icon");
    const windInfo = document.getElementById("wind-info");

    const symbol = xmlDoc.querySelector("symbol");
    const wind = xmlDoc.querySelector("windSpeed");
    const windSpeed = wind?.getAttribute("mps");
    const windName = wind?.getAttribute("name");

    if (windSpeed && windName && windInfo) {
      const windFormatted = parseFloat(windSpeed).toFixed(1).replace(".", ",");
      windInfo.textContent = `${windFormatted} m/s – ${windName}`;
    }

    const code = symbol?.getAttribute("code");
    if (code && weatherIcon) {
      weatherIcon.src = `${basePath}graphic/weather/svg/${code}.svg`;
    } else if (!code) {
      console.warn("No weather symbol code found");
    }
  },

  setAccessLevel(access) {
    const accessInfo = document.getElementById("access-level-info");
    if (accessInfo) {
      accessInfo.textContent = `Access level: ${access.toUpperCase()}`;
    } else {
      console.warn("Access level info element not found");
    }

    // Optional: unlock features based on access
    if (access === "admin") {
      // Show advanced settings or debug info
    } else if (access === "level3") {
      // Show medium access content
    }
  },

  loadMenuIfAuthorized(accessLevel) {
    const menuContainer = document.getElementById("menu-of-the-day");
    const menuList = document.getElementById("menu-list");

    if (!menuContainer || !menuList) {
      console.error("Menu elements not found");
      return;
    }

    menuContainer.classList.add("d-none"); // Hide initially

    const allowedAccess = ["level1", "level2", "admin"];
    if (!allowedAccess.includes(accessLevel)) return;

    fetch("https://i74qu6dp3m.execute-api.us-east-2.amazonaws.com/")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!data.days) throw new Error("No 'days' data in response");
        const today = new Date().toLocaleDateString("no-NO", {
          weekday: "long",
        });
        const todayData = data.days.find(
          (d) => d.day.toLowerCase() === today.toLowerCase()
        );

        if (todayData) {
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
        } else {
          console.warn("No menu data for today");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch today's menu:", err);
        menuContainer.textContent = "Could not load menu";
        menuContainer.classList.remove("d-none");
      });
  },
};
