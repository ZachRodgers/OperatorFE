import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, useSpring } from "framer-motion";
import lots from "../data/lots_master.json";
import lotData from "../data/lot_daily_data.json";
import "./RevenueDashboard.css";
import { ResponsiveContainer, LineChart, AreaChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";


interface LotEntry {
  lotId: string;
  date: string;
  totalVehicles: string;
  averageOccupancy: string;
  upTime: string;
  totalRevenue: number;
  pendingRevenue: number;
  subscriberRevenue: number;
}

const useAnimatedNumber = (value: number, decimals: number) => {
  const animatedValue = useSpring(value, { stiffness: 10000, damping: 600 });
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const unsubscribe = animatedValue.onChange((latest) => {
      setDisplayValue(parseFloat(latest.toFixed(decimals)));
    });
    return () => unsubscribe();
  }, [animatedValue, decimals]);

  useEffect(() => {
    animatedValue.set(value);
  }, [value, animatedValue]);

  return displayValue;
};

const RevenueDashboard: React.FC = () => {
  const { customerId, lotId } = useParams<{ customerId: string; lotId: string }>();
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">("day");
  const [filteredData, setFilteredData] = useState<LotEntry[]>([]);
  const [previousData, setPreviousData] = useState<LotEntry[]>([]);

  const lot = lots.find((l) => l.lotId === lotId);
  const lotName = lot ? (lot.lotName.length > 50 ? lot.lotName.substring(0, 50) + "..." : lot.lotName) : "Unknown Lot";
  const [prevTimeframe, setPrevTimeframe] = useState(timeframe);



  useEffect(() => {
    const today = new Date();
    const lotEntries = lotData.filter((entry) => entry.lotId === lotId);
  
    let filtered: LotEntry[] = [];
    let previous: LotEntry[] = [];
  
    if (timeframe === "day") {
      filtered = filterByDate(today, lotEntries);
      previous = filterByDate(getPreviousDate(today), lotEntries);
    } else if (timeframe === "week") {
      filtered = getWeekData(today, lotEntries);
      previous = getWeekData(getPreviousWeek(today), lotEntries);
    } else if (timeframe === "month") {
      filtered = getMonthData(today, lotEntries);
      previous = getMonthData(getPreviousMonth(today), lotEntries);
    } else if (timeframe === "year") {
      filtered = getYearData(today, lotEntries);
      previous = getYearData(getPreviousYear(today), lotEntries);
    }
  
    setFilteredData(filtered.length > 0 ? filtered : getEmptyDayData(today));
    setPreviousData(previous);
  
    // Ensure a horizontal line when only one data point exists
    let graphData = filtered.map((entry) => ({
      date: entry.date,
      revenue: entry.totalRevenue,
      pendingRevenue: entry.pendingRevenue,
      subscriptions: entry.subscriberRevenue || 0,
    }));
  
    if (timeframe === "day" && graphData.length === 1) {
      const singlePoint = graphData[0];
      graphData = [
        { ...singlePoint, date: formatDateOffset(singlePoint.date, -1) },
        singlePoint,
        { ...singlePoint, date: formatDateOffset(singlePoint.date, +1) },
      ];
    }
  
    setGraphData(graphData);
  
    setPrevTimeframe(timeframe);
  }, [lotId, timeframe]);
  
  
  

  const calculateSum = (data: LotEntry[], key: keyof LotEntry) =>
    data.reduce((sum, entry) => sum + Number(entry[key]), 0);

  const calculateAvg = (data: LotEntry[], key: keyof LotEntry): number =>
    data.length > 0 ? parseFloat((calculateSum(data, key) / data.length).toFixed(1)) : 0;

  const calculateChange = (current: number, previous: number) =>
    previous > 0 ? ((current - previous) / previous) * 100 : 0;

  const totalRevenue = calculateSum(filteredData, "totalRevenue");
  const previousRevenue = calculateSum(previousData, "totalRevenue");
  const revenueChange = calculateChange(totalRevenue, previousRevenue);

  const totalSubscriberRevenue = calculateSum(filteredData, "subscriberRevenue");

  const totalVehicles = calculateSum(filteredData, "totalVehicles");
  const previousVehicles = calculateSum(previousData, "totalVehicles");
  const vehiclesChange = calculateChange(totalVehicles, previousVehicles);

  const avgOccupancy = calculateAvg(filteredData, "averageOccupancy");
  const previousOccupancy = calculateAvg(previousData, "averageOccupancy");
  const occupancyChange = calculateChange(avgOccupancy, previousOccupancy);

  const avgUptime = calculateAvg(filteredData, "upTime");
  const previousUptime = calculateAvg(previousData, "upTime");
  const uptimeChange = calculateChange(avgUptime, previousUptime);

  const pendingRevenue = filteredData.length > 0 ? filteredData[filteredData.length - 1].pendingRevenue : 0;

  const trendArrow = (change: number) => (change >= 0 ? "/assets/DataUp.svg" : "/assets/DataDown.svg");
  const previousLabel = timeframe === "day" ? "Yesterday" : timeframe === "week" ? "Last Week" : timeframe === "month" ? "Last Month" : "Last Year";

  const getTrendTextClass = (change: number) => (change >= 0 ? "trend-text up" : "trend-text down");

  const [graphData, setGraphData] = useState<any[]>([]);
  const [hoveredData, setHoveredData] = useState<LotEntry | null>(null);
  

  return (
    <div className="content">
      <h1>Dashboard <span className="lot-name">{lotName}</span></h1>
  
      <div className="header-controls">
        <div className="timeframe-selector" data-active={timeframe}>
          <div className="active-pill"></div>
          {["day", "week", "month", "year"].map((t) => (
            <button
              key={t}
              className={timeframe === t ? "active" : ""}
              onClick={() => setTimeframe(t as any)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
  
        <button className="setup-button" onClick={() => alert("In development.")}>
          + Setup New Camera
        </button>
      </div>
  
      <div className="metrics-container">
        {[
          { title: "Revenue", value: totalRevenue, prefix: "$", change: revenueChange, prevValue: previousRevenue, decimals: 2 },
          { title: "Parked Cars", value: totalVehicles, prefix: "", change: vehiclesChange, prevValue: previousVehicles, decimals: 0 },
          { title: "Avg. Occupancy", value: avgOccupancy, prefix: "", suffix: "%", change: occupancyChange, prevValue: previousOccupancy, decimals: 1 },
          { title: "Uptime", value: avgUptime, prefix: "", suffix: "%", change: uptimeChange, prevValue: previousUptime, decimals: 1 },
        ].map(({ title, value, prefix, suffix = "", change, prevValue, decimals }) => {
          const animatedValue = useAnimatedNumber(value, decimals);
          const animatedPrevValue = useAnimatedNumber(prevValue, decimals);
          const animatedChange = useAnimatedNumber(change, 2);
          return (
            <div className="metric" key={title}>
              <span className="metric-value">
                {prefix}
                <motion.span>
                  {decimals === 2
                    ? `${Math.floor(animatedValue)}`
                    : animatedValue.toFixed(decimals)}
                </motion.span>
                {decimals === 2 && (
                  <motion.span className="decimal">.{animatedValue.toFixed(2).split(".")[1]}</motion.span>
                )}
                {suffix}
              </span>
              <span className="metric-title">{title}</span>
              <div className="trend-container">
                <motion.img src={trendArrow(change)} alt="trend" className="trend-arrow" animate={{ rotate: change < 0 ? 180 : 0 }} />
                <span className={getTrendTextClass(change)}>
                <motion.span>{animatedChange}</motion.span>%
                </span>
              </div>
              <span className="previous-cycle">
              {prefix}
                <motion.span>{animatedPrevValue}</motion.span>
                {suffix} {previousLabel}
              </span>
            </div>
          );
        })}
      </div>
  
      {/* Graph Container - Below Metrics */}
      <div className="graph-wrapper">
        <div className="graph-section">
        <ResponsiveContainer width="100%" height={300}>
  <AreaChart
    data={graphData}
    margin={{ top: 0, left: -60, right: 0, bottom: 5}}
    onMouseMove={(e) => setHoveredData(e.activePayload?.[0]?.payload || null)}
    onMouseLeave={() => setHoveredData(null)}
  >
    <defs>
      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#007bff" stopOpacity={0.25} />
        <stop offset="70%" stopColor="#007bff" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffbc3f" stopOpacity={0.25} />
        <stop offset="90%" stopColor="#ffbc3f" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="subscriptionsGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#00CFB7" stopOpacity={0.25} />
        <stop offset="90%" stopColor="#00CFB7" stopOpacity={0} />
      </linearGradient>
    </defs>

    <CartesianGrid strokeDasharray="3 3" />
    <XAxis
  dataKey="date"
  orientation="top"
  tickMargin={10}
  interval={0}
  axisLine={false} // ✅ Removes the X-axis line
  tickLine={false} // ✅ Removes the small tick marks
  tick={(props) => {
    const { x, y, payload, index } = props;
    const dx = index === 0 ? 40 : index === graphData.length - 1 ? -40 : 0; // ✅ Move only first and last label

    return (
      <text x={x + dx} y={y} textAnchor="middle" fill="#666">
        {timeframe === "day"
          ? index === 1
            ? new Date(payload.value).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : ""
          : timeframe === "week"
          ? formatDayOfWeek(payload.value)
          : timeframe === "month"
          ? formatMonthWeeks(payload.value, index)
          : timeframe === "year"
          ? formatMonthAbbreviation(payload.value, index)
          : payload.value}
      </text>
    );
  }}
/>




    <YAxis tick={false} axisLine={false} />
    <Tooltip content={() => null} />

    <Area
      type="monotone"
      dataKey="revenue"
      stroke="#007bff"
      strokeWidth={2}
      fill="url(#revenueGradient)"
      fillOpacity={1}
      animationDuration={500}
    />

    <Area
      type="monotone"
      dataKey="pendingRevenue"
      stroke="#ffbc3f"
      strokeWidth={2}
      fill="url(#pendingGradient)"
      fillOpacity={1}
      animationDuration={500}
    />

    <Area
      type="monotone"
      dataKey="subscriptions"
      stroke="#00CFB7"
      strokeWidth={2}
      fill="url(#subscriptionsGradient)"
      fillOpacity={1}
      animationDuration={500}
    />
  </AreaChart>
</ResponsiveContainer>
        </div>
<div className="graph-metrics">
  {[
    { title: "Revenue", key: "revenue", totalValue: totalRevenue, className: "" },
    { title: "Pending Revenue", key: "pendingRevenue", totalValue: pendingRevenue, className: "pending-revenue" },
    { title: "Subscriptions", key: "subscriptions", totalValue: totalSubscriberRevenue, className: "subscriber-revenue" },
  ].map(({ title, key, totalValue, className }) => {

    const latestEntry = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
    const latestValue = latestEntry ? Number(latestEntry[key as keyof LotEntry]) || 0 : 0;

    // Get hovered data if available
    const hoveredValue = hoveredData && key in hoveredData
      ? Number(hoveredData[key as keyof typeof hoveredData]) || 0
      : null;

    // Use a separate animated state that updates after the new timeframe is applied
    const [animatedTotal, setAnimatedTotal] = useState(totalValue);
    const animatedValue = useAnimatedNumber(animatedTotal, 2);

    useEffect(() => {
      setAnimatedTotal(totalValue); // Ensure animations use the latest value immediately
    }, [totalValue]);

    // Ensure correct value is displayed:
    // - Use hovered value if hovering
    // - Otherwise, show animated value
    const displayNumber = hoveredValue !== null ? hoveredValue.toFixed(2) : animatedValue.toFixed(2);
    
    // Ensure always showing 2 decimals
    const [wholePart, decimalPart] = displayNumber.includes(".") ? displayNumber.split(".") : [displayNumber, "00"];

    return (
      <div className="metric graph-metric" key={title}>
        <span className={`metric-value ${className}`}>
          ${wholePart}
          <span className="decimal">.{decimalPart}</span>
        </span>
        <span className="metric-title">{title}</span>
      </div>
    );
  })}
</div>
      </div>
    </div>
  );
  
};

// Converts a date to the weekday abbreviation (Mon, Tue, etc.)
const formatDayOfWeek = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short" }); // "Mon", "Tue", etc.
};

const formatMonthWeeks = (() => {
  return (dateString: string, index: number) => {
    // Calculate the current week number based on index
    const weekNumber = Math.floor(index / 7) + 1;

    // Show only the first instance of each week
    if (index % 7 === 0) {
      return `Week ${weekNumber}`;
    }
    return "";
  };
})();

const formatMonthAbbreviation = (() => {
  let lastMonth = "";

  return (dateString: string, index: number) => {
    const date = new Date(dateString);
    const monthLabel = date.toLocaleDateString("en-US", { month: "short" });

    if (index === 0 || monthLabel !== lastMonth) {
      lastMonth = monthLabel;
      return monthLabel;
    }
    return "";
  };
})();


export default RevenueDashboard;


// Utility functions for date operations
const formatDate = (date: Date): string => date.toISOString().split("T")[0];

const getPreviousDate = (date: Date): Date => {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  return prev;
};

const getPreviousWeek = (date: Date): Date => {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 7);
  return prev;
};

const getPreviousMonth = (date: Date): Date => {
  const prev = new Date(date);
  prev.setMonth(prev.getMonth() - 1);
  return prev;
};

const getPreviousYear = (date: Date): Date => {
  const prev = new Date(date);
  prev.setFullYear(prev.getFullYear() - 1);
  return prev;
};

const filterByDate = (date: Date, data: LotEntry[]): LotEntry[] => {
  const dateStr = formatDate(date);
  return data.filter(entry => entry.date === dateStr);
};

const getWeekData = (date: Date, data: LotEntry[]): LotEntry[] => {
  const start = getPreviousWeek(date);
  return data.filter(entry => new Date(entry.date) >= start && new Date(entry.date) <= date);
};

const getMonthData = (date: Date, data: LotEntry[]): LotEntry[] => {
  const yearMonth = formatDate(date).slice(0, 7);
  return data.filter(entry => entry.date.startsWith(yearMonth));
};

const getYearData = (date: Date, data: LotEntry[]): LotEntry[] => {
  const year = formatDate(date).slice(0, 4);
  return data.filter(entry => entry.date.startsWith(year));
};

const formatDateOffset = (dateString: string, offsetDays: number) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0]; // Returns in YYYY-MM-DD format
};


const getEmptyDayData = (date: Date): LotEntry[] => [{
  date: formatDate(date),
  lotId: "0000-0000",
  totalVehicles: "0",
  averageOccupancy: "N/A",
  upTime: "N/A",
  totalRevenue: 0,
  pendingRevenue: 0,
  subscriberRevenue: 0,
}];
