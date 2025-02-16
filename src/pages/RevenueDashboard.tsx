import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, useSpring } from "framer-motion";
import lots from "../data/lots_master.json";
import lotData from "../data/lot_daily_data.json";
import "./RevenueDashboard.css";

interface LotEntry {
  lotId: string;
  date: string;
  totalVehicles: string;
  averageOccupancy: string;
  upTime: string;
  totalRevenue: number;
  pendingRevenue: number;
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
          return (
            <div className="metric" key={title}>
              <span className="metric-value">
                {prefix}
                {decimals === 2 ? (
                  <>
                    {Math.floor(animatedValue)}
                    <span className="decimal">.{animatedValue.toFixed(2).split(".")[1]}</span>
                  </>
                ) : (
                  animatedValue.toFixed(decimals)
                )}
                {suffix}
              </span>
              <span className="metric-title">{title}</span>
              <div className="trend-container">
                <motion.img src={trendArrow(change)} alt="trend" className="trend-arrow" animate={{ rotate: change < 0 ? 180 : 0 }} />
                <span className={getTrendTextClass(change)}>
                  {change.toFixed(2)}%
                </span>
              </div>
              <span className="previous-cycle">
                {prefix}{prevValue.toFixed(decimals)}{suffix} {previousLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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

const getEmptyDayData = (date: Date): LotEntry[] => [{
  date: formatDate(date),
  lotId: "0000-0001",
  totalVehicles: "0",
  averageOccupancy: "N/A",
  upTime: "N/A",
  totalRevenue: 0,
  pendingRevenue: 0,
}];
