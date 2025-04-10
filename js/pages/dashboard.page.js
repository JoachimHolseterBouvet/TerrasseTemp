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
      if (isSunny) score += 5; // Sunny bonus
      score -= wind * 2; // Wind penalty
      return score;
    }

    // --- First loop to find the best candidate (remains the same) ---
    timeElements.forEach((t) => {
      const from = t.getAttribute("from");
      const to = t.getAttribute("to");
      const date = new Date(from);
      const hour = date.getHours();
      const isToday = from.startsWith(today);
      const isSameHour = from === to; // Only consider forecasts for a specific hour, not ranges

      // Check if it's today, within working hours (9-15), and a single-hour forecast
      if (isToday && isSameHour && hour >= 9 && hour <= 15) {
        // console.log(t.outerHTML); // Debugging: useful but can be noisy
        // console.log(`⏰ Checking ${from} (${hour}h)`); // Debugging
        const location = t.querySelector("location");
        if (!location) return; // Skip if no location data for this time slot

        const tempEl = location.querySelector("temperature");
        const windEl = location.querySelector("windSpeed");
        const symbolEl = location.querySelector("symbol");
        const cloudEl = location.querySelector("cloudiness"); // Get cloudiness

        if (tempEl && windEl) {
          // Need at least temp and wind
          // console.log("✔️ Valid data for hour:", { tempEl, windEl, symbolEl }); // Debugging
          const temp = parseFloat(tempEl.getAttribute("value") || "0");
          const wind = parseFloat(windEl.getAttribute("mps") || "0");
          const condition =
            symbolEl?.getAttribute("code")?.toLowerCase() || "unknown"; // Default if missing
          const cloudiness = parseFloat(
            cloudEl?.getAttribute("percent") || "0"
          ); // Get cloudiness value

          // Define 'sunny' based on MET Norway codes (adjust as needed)
          const isSunny = [
            "clearsky_day",
            "fair_day",
            "partlycloudy_day",
            // Add more codes if they should count as 'sunny enough'
          ].some((sunnyCode) => condition.startsWith(sunnyCode));

          totalConsidered++;
          if (
            condition.includes("rain") ||
            condition.includes("sleet") ||
            condition.includes("snow")
          ) {
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
              cloudiness,
            };
          }
        } else {
          console.warn("Missing temperature or wind data for", from);
        }
      }
    }); // End of first loop

    const rainAllDay = totalConsidered > 0 && rainCounter === totalConsidered;

    if (rainAllDay) {
      coffeeMessage.innerHTML = `🌧️ Regn hele dagen, ta kaffepausen inne ☕`;
      coffeeExplanation.textContent = "";
    } else if (bestCandidate) {
      // Check for high cloudiness *after* finding the best candidate
      const isTooCloudy = bestCandidate.cloudiness >= 95;

      if (isTooCloudy) {
        coffeeMessage.innerHTML = `☁️ For overskyet (${bestCandidate.cloudiness.toFixed(
          0
        )}%) for utepause. Ta kaffen inne!`;
        coffeeExplanation.textContent = `Best tid ellers ville vært kl. ${bestCandidate.time} (${bestCandidate.temp}°C, ${bestCandidate.wind} m/s).`;
      } else {
        coffeeMessage.innerHTML = `😎 Anbefalt kaffepause ute kl. <strong>${bestCandidate.time}</strong>`;
        // Generate explanation (including potential runner-up logic if desired)
        let reason = `${bestCandidate.time} vurderes som best: ${
          bestCandidate.temp
        }°C, ${bestCandidate.wind} m/s vind, ${bestCandidate.cloudiness.toFixed(
          0
        )}% skydekke (score: ${bestCandidate.score.toFixed(1)}).`;

        // --- Optional: Runner-up logic (keep or remove based on need) ---
        // Note: This requires another loop or storing more data in the first loop
        // If keeping it, integrate it here to add to the 'reason' string.
        // Example: Find runner-up and add:
        // if (runnerUp && Math.abs(runnerUp.score - bestCandidate.score) < 1.5) {
        //   reason += ` ${runnerUp.time} var nesten like bra (${runnerUp.temp}°C, ${runnerUp.wind} m/s).`;
        // }
        // --- End Optional Runner-up ---

        coffeeExplanation.textContent = reason;
      }

      // --- Removed the duplicated isTooCloudy block and message setting from here ---
    } else {
      // No best candidate found (e.g., no data in the 9-15 range)
      coffeeMessage.textContent =
        "Fant ingen passende tid for kaffepause ute i dag.";
      coffeeExplanation.textContent = "";
    }
    box.style.display = "block"; // Show the recommendation box
  }, // End of recommendCoffeeBreak

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
      const uv = xmlDoc.querySelector("uvIndex");
      const uvValue = uv?.getAttribute("value");
      const windFormatted = parseFloat(windSpeed).toFixed(1).replace(".", ",");
      const uvText = uvValue ? ` – UV: ${uvValue}` : "";
      windInfo.textContent = `${windFormatted} m/s – ${windName}${uvText}`;
      // --- Removed the stray line from here ---
    } // <--- Added the closing brace back if it was missing, or just ensure the extra line is gone.

    const code = symbol?.getAttribute("code");
    if (code && weatherIcon) {
      // Assuming basePath is correctly defined and imported
      // Ensure basePath ends with a slash if needed, or adjust the path string
      weatherIcon.src = `${basePath}graphic/weather/svg/${code}.svg`;
    } else if (!code) {
      console.warn("No weather symbol code found");
    } else if (!weatherIcon) {
      console.warn("Weather icon element not found"); // Added check for missing element
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
        const now = new Date();
        const today = now.toLocaleDateString("no-NO", { weekday: "long" });
        const hourNow = now.getHours();
        const isFriday = today.toLowerCase() === "fredag";

        let menuDay = today;
        if (hourNow >= 13 && !isFriday) {
          const nextDayIndex = (now.getDay() + 1) % 7;
          const weekdayNames = [
            "søndag",
            "mandag",
            "tirsdag",
            "onsdag",
            "torsdag",
            "fredag",
            "lørdag",
          ];
          menuDay = weekdayNames[nextDayIndex];
        }

        if (isFriday && hourNow >= 13) {
          console.log("📅 It's Friday after 13:00, not showing menu.");
          const heading = document.querySelector("#menu-of-the-day h3");
          if (heading) heading.textContent = "";
          menuContainer.classList.remove("d-none");
          menuList.innerHTML = `<li class="list-group-item text-muted">God helg! 💃</li>`;
          return;
        }

        const todayData = data.days.find(
          (d) => d.day.toLowerCase() === menuDay.toLowerCase()
        );

        if (todayData) {
          const heading = document.querySelector("#menu-of-the-day h3");
          if (heading)
            heading.textContent =
              hourNow >= 13 ? "Morgendagens meny" : "Dagens meny";
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
