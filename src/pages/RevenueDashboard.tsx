import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, useSpring, useMotionValue, useTransform, MotionValue } from "framer-motion";
import "./RevenueDashboard.css";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import LoadingWheelSmall from "../components/LoadingWheelSmall";
import { lotDailyDataService, lotService, devicesService } from "../utils/api";

interface DashboardMetrics {
  date: string;
  totalRevenue: number;
  totalVehicles: string;
  averageOccupancy: string;
  upTime: number;
}

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

interface Device {
  deviceId: string;
  deviceStatus: string;
}

interface MetricProps {
  title: string;
  value: MotionValue<number>;
  prefix: string;
  suffix?: string;
  change?: number;
  prevValue?: MotionValue<number>;
  decimals: number;
  hideChange?: boolean;
  deviceStatus?: {
    online: number;
    offline: number;
    calibrating: number;
    recentlyAdded: number;
    onlineCount: number;
    offlineCount: number;
  };
}

const RevenueDashboard: React.FC = () => {
  const { customerId, lotId } = useParams<{ customerId: string; lotId: string }>();
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">("day");
  const [filteredData, setFilteredData] = useState<LotEntry[]>([]);
  const [previousData, setPreviousData] = useState<LotEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [hoveredData, setHoveredData] = useState<LotEntry | null>(null);
  const [lotName, setLotName] = useState<string>("Unknown Lot");
  const [isCompact, setIsCompact] = useState(false);
  const timeframeRef = useRef<HTMLDivElement>(null);
  const [devices, setDevices] = useState<Device[]>([]);

  // Create animated values using useSpring directly
  const animatedRevenue = useSpring(0, { stiffness: 10000, damping: 600 });
  const animatedParkedCars = useSpring(0, { stiffness: 10000, damping: 600 });
  const animatedAvgOccupancy = useSpring(0, { stiffness: 10000, damping: 600 });
  const animatedUptime = useSpring(0, { stiffness: 10000, damping: 600 });
  const animatedPrevRevenue = useSpring(0, { stiffness: 10000, damping: 600 });
  const animatedPrevParkedCars = useSpring(0, { stiffness: 10000, damping: 600 });
  const animatedPrevAvgOccupancy = useSpring(0, { stiffness: 10000, damping: 600 });
  const animatedPrevUptime = useSpring(0, { stiffness: 10000, damping: 600 });

  // Fetch lot name when component mounts
  useEffect(() => {
    const fetchLotName = async () => {
      if (!lotId) return;
      try {
        const lotData = await lotService.getLotById(lotId);
        setLotName(lotData.lotName || "Unknown Lot");
      } catch (error) {
        console.error("Error fetching lot name:", error);
        setLotName("Unknown Lot");
      }
    };
    fetchLotName();
  }, [lotId]);

  // Add effect to handle timeframe selector width
  useEffect(() => {
    const checkWidth = () => {
      if (timeframeRef.current) {
        setIsCompact(timeframeRef.current.offsetWidth < 230);
      }
    };

    // Initial check
    checkWidth();

    // Create resize observer
    const resizeObserver = new ResizeObserver(checkWidth);
    if (timeframeRef.current) {
      resizeObserver.observe(timeframeRef.current);
    }

    // Cleanup
    return () => {
      if (timeframeRef.current) {
        resizeObserver.unobserve(timeframeRef.current);
      }
    };
  }, []);

  // Add fetchDevices function
  const fetchDevices = async () => {
    if (!lotId) return;
    try {
      const devicesData = await devicesService.getDevicesByLot(lotId);
      setDevices(devicesData);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!lotId) {
        setError("Lot ID is required");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch devices data
        await fetchDevices();

        const today = new Date();
        let startDate: Date;
        let endDate: Date;
        let prevStartDate: Date;
        let prevEndDate: Date;

        switch (timeframe) {
          case "day":
            startDate = new Date(today);
            endDate = new Date(today);
            prevStartDate = getPreviousDate(today);
            prevEndDate = getPreviousDate(today);
            break;
          case "week":
            // For current week, get today and previous 6 days
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 6);
            endDate = new Date(today);
            // For previous week, get the 7 days before today
            prevStartDate = new Date(today);
            prevStartDate.setDate(prevStartDate.getDate() - 13);
            prevEndDate = new Date(today);
            prevEndDate.setDate(prevEndDate.getDate() - 7);
            break;
          case "month":
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = today;
            prevStartDate = getPreviousMonth(today);
            prevEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
          case "year":
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = today;
            prevStartDate = getPreviousYear(today);
            prevEndDate = new Date(today.getFullYear() - 1, 11, 31);
            break;
          default:
            startDate = today;
            endDate = today;
            prevStartDate = getPreviousDate(today);
            prevEndDate = getPreviousDate(today);
        }

        // Format dates as YYYY-MM-DD
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        const formattedPrevStartDate = prevStartDate.toISOString().split('T')[0];
        const formattedPrevEndDate = prevEndDate.toISOString().split('T')[0];

        // Fetch current period data
        const metrics: DashboardMetrics[] = await lotDailyDataService.getDashboardMetrics(
          lotId,
          formattedStartDate,
          formattedEndDate
        );

        // Fetch previous period data
        const prevMetrics: DashboardMetrics[] = await lotDailyDataService.getDashboardMetrics(
          lotId,
          formattedPrevStartDate,
          formattedPrevEndDate
        );

        // Convert metrics to LotEntry format
        const convertedData: LotEntry[] = metrics.map((metric: DashboardMetrics) => ({
          lotId,
          date: metric.date,
          totalVehicles: metric.totalVehicles,
          averageOccupancy: metric.averageOccupancy,
          upTime: metric.upTime.toString(),
          totalRevenue: metric.totalRevenue,
          pendingRevenue: 0,
          subscriberRevenue: 0
        }));

        const prevConvertedData: LotEntry[] = prevMetrics.map((metric: DashboardMetrics) => ({
          lotId,
          date: metric.date,
          totalVehicles: metric.totalVehicles,
          averageOccupancy: metric.averageOccupancy,
          upTime: metric.upTime.toString(),
          totalRevenue: metric.totalRevenue,
          pendingRevenue: 0,
          subscriberRevenue: 0
        }));

        // Update states
        setFilteredData(convertedData);
        setPreviousData(prevConvertedData);

        // Set graph data
        let newGraphData = convertedData.map((entry) => ({
          date: entry.date,
          revenue: entry.totalRevenue,
          pendingRevenue: entry.pendingRevenue,
          subscriptions: entry.subscriberRevenue || 0,
        }));

        if (timeframe === "day" && newGraphData.length === 1) {
          const singlePoint = newGraphData[0];
          newGraphData = [
            { ...singlePoint, date: formatDateOffset(singlePoint.date, -1) },
            singlePoint,
            { ...singlePoint, date: formatDateOffset(singlePoint.date, +1) },
          ];
        }

        if (timeframe === "week") {
          // Create an array of 7 days starting from today
          const days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - (6 - i));
            return formatDate(date);
          });

          // Map the data to these days, filling in zeros for missing days
          newGraphData = days.map(date => {
            const existingData = convertedData.find(d => d.date === date);
            return {
              date,
              revenue: existingData?.totalRevenue ?? 0,
              pendingRevenue: existingData?.pendingRevenue ?? 0,
              subscriptions: existingData?.subscriberRevenue ?? 0
            };
          });
        }

        setGraphData(newGraphData);

        // Update animated values
        const totalRevenue = calculateSum(convertedData, "totalRevenue");
        const previousRevenue = calculateSum(prevConvertedData, "totalRevenue");
        const totalVehicles = calculateSum(convertedData, "totalVehicles");
        const previousVehicles = calculateSum(prevConvertedData, "totalVehicles");
        const avgOccupancy = calculateAvg(convertedData, "averageOccupancy");
        const previousOccupancy = calculateAvg(prevConvertedData, "averageOccupancy");
        const avgUptime = calculateAvg(convertedData, "upTime");
        const previousUptime = calculateAvg(prevConvertedData, "upTime");

        // Update animated values
        animatedRevenue.set(totalRevenue);
        animatedParkedCars.set(totalVehicles);
        animatedAvgOccupancy.set(avgOccupancy);
        animatedUptime.set(avgUptime);
        animatedPrevRevenue.set(previousRevenue);
        animatedPrevParkedCars.set(previousVehicles);
        animatedPrevAvgOccupancy.set(previousOccupancy);
        animatedPrevUptime.set(previousUptime);

      } catch (err) {
        setError("Failed to fetch dashboard data");
        console.error("Error fetching dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
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
  const previousLabel = timeframe === "day"
    ? "Yesterday"
    : timeframe === "week"
      ? "Last Week"
      : timeframe === "month"
        ? "Last Month"
        : "Last Year";

  const getTrendTextClass = (change: number) => (change >= 0 ? "trend-text up" : "trend-text down");

  // Calculate online and offline devices
  const deviceStatusCounts = devices.reduce((acc, device) => {
    switch (device.deviceStatus) {
      case "ONLINE":
        acc.online++;
        acc.onlineCount++;
        break;
      case "Calibrating":
        acc.calibrating++;
        acc.onlineCount++;
        break;
      case "RecentlyAdded":
        acc.recentlyAdded++;
        acc.offlineCount++;
        break;
      case "OFFLINE":
      default:
        acc.offline++;
        acc.offlineCount++;
        break;
    }
    return acc;
  }, {
    online: 0,
    offline: 0,
    calibrating: 0,
    recentlyAdded: 0,
    onlineCount: 0,
    offlineCount: 0
  });

  const metrics: MetricProps[] = [
    {
      title: "Revenue",
      value: animatedRevenue,
      prefix: "$",
      change: revenueChange,
      prevValue: animatedPrevRevenue,
      decimals: 2
    },
    {
      title: "Parked Cars",
      value: animatedParkedCars,
      prefix: "",
      change: vehiclesChange,
      prevValue: animatedPrevParkedCars,
      decimals: 0
    },
    {
      title: "Avg. Occupancy",
      value: animatedAvgOccupancy,
      prefix: "",
      suffix: "%",
      change: occupancyChange,
      prevValue: animatedPrevAvgOccupancy,
      decimals: 1
    },
    {
      title: "Uptime",
      value: animatedUptime,
      prefix: "",
      suffix: "%",
      hideChange: true,
      deviceStatus: {
        online: deviceStatusCounts.online,
        offline: deviceStatusCounts.offline,
        calibrating: deviceStatusCounts.calibrating,
        recentlyAdded: deviceStatusCounts.recentlyAdded,
        onlineCount: deviceStatusCounts.onlineCount,
        offlineCount: deviceStatusCounts.offlineCount
      },
      decimals: 1
    }
  ];

  return (
    <div className="content">
      <div className="header-section">
        <h1>Dashboard <span className="lot-name">{lotName}</span>{isLoading && (<span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.5rem' }}><span style={{ display: 'inline-block' }}><LoadingWheelSmall /></span></span>)}</h1>
      </div>

      <div className="header-controls">
        <div className="timeframe-selector" data-active={timeframe} ref={timeframeRef}>
          <div className="active-pill"></div>
          {[
            { key: "day", label: isCompact ? "D" : "Day" },
            { key: "week", label: isCompact ? "W" : "Week" },
            { key: "month", label: isCompact ? "M" : "Month" },
            { key: "year", label: isCompact ? "Y" : "Year" }
          ].map(({ key, label }) => (
            <button
              key={key}
              className={timeframe === key ? "active" : ""}
              onClick={() => setTimeframe(key as any)}
              disabled={isLoading}
            >
              {label}
            </button>
          ))}
        </div>

        <button className="setup-button" onClick={() => alert("In development.")}>
          + Setup New Camera
        </button>
      </div>

      <div className="metrics-container">
        {metrics.map((metric) => {
          const displayValue = useTransform(metric.value, (latest: number) => Number(latest).toFixed(metric.decimals));
          const displayPrevValue = metric.prevValue
            ? useTransform(metric.prevValue, (latest: number) => Number(latest).toFixed(metric.decimals))
            : undefined;

          return (
            <motion.div
              className="metric"
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="metric-value">
                {metric.prefix}
                <motion.span>
                  {displayValue}
                </motion.span>
                {metric.suffix}
              </span>
              <span className="metric-title">{metric.title}</span>
              {!metric.hideChange && metric.change !== undefined ? (
                <>
                  <div className="trend-container">
                    <motion.img
                      src={trendArrow(metric.change)}
                      alt="trend"
                      className="trend-arrow"
                      animate={{ rotate: metric.change < 0 ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                    <motion.div
                      className={getTrendTextClass(metric.change)}
                      key={`${metric.change}-${metric.title}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                        mass: 1
                      }}
                    >
                      {metric.change.toFixed(2)}%
                    </motion.div>
                  </div>
                  <span className="previous-cycle">
                    {metric.prefix}
                    {displayPrevValue && <motion.span>{displayPrevValue}</motion.span>}
                    {metric.suffix} {previousLabel}
                  </span>
                </>
              ) : metric.deviceStatus && (
                <div className="device-status">
                  <div className="device-dots">
                    {Array(metric.deviceStatus.online).fill(0).map((_, i) => (
                      <span key={`online-${i}`} className="device-dot online" />
                    ))}
                    {Array(metric.deviceStatus.calibrating).fill(0).map((_, i) => (
                      <span key={`calibrating-${i}`} className="device-dot calibrating" />
                    ))}
                    {Array(metric.deviceStatus.recentlyAdded).fill(0).map((_, i) => (
                      <span key={`recent-${i}`} className="device-dot recently-added" />
                    ))}
                    {Array(metric.deviceStatus.offline).fill(0).map((_, i) => (
                      <span key={`offline-${i}`} className="device-dot offline" />
                    ))}
                  </div>
                  <span className="device-count">
                    {metric.deviceStatus.onlineCount} Online, {metric.deviceStatus.offlineCount} Offline
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Graph Container */}
      <div className="graph-wrapper">
        <div className="graph-section">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={graphData}
              margin={{ top: 0, left: -60, right: 0, bottom: 5 }}
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

              <CartesianGrid stroke="rgba(0, 0, 0, 0.07)" strokeDasharray="0" />

              <XAxis
                dataKey="date"
                orientation="top"
                tickMargin={10}
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={(props) => {
                  const { x, y, payload, index } = props;
                  const dx = index === 0 ? 40 : index === graphData.length - 1 ? -40 : 0;

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
              <Tooltip content={() => null} cursor={{ stroke: "#767676", strokeWidth: 1, strokeDasharray: "5 5" }} />


              {/* ✅ Hover Line & Dot */}

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#007bff"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                fillOpacity={1}
                animationDuration={500}
                activeDot={{ r: 7, strokeWidth: 2, stroke: "white", fill: "#007bff" }}

              />

              <Area
                type="monotone"
                dataKey="pendingRevenue"
                stroke="#ffbc3f"
                strokeWidth={2}
                fill="url(#pendingGradient)"
                fillOpacity={1}
                animationDuration={500}
                activeDot={{ r: 7, strokeWidth: 2, stroke: "white", fill: "#ffbc3f" }}
              />

              <Area
                type="monotone"
                dataKey="subscriptions"
                stroke="#00CFB7"
                strokeWidth={2}
                fill="url(#subscriptionsGradient)"
                fillOpacity={1}
                animationDuration={500}
                activeDot={{ r: 7, strokeWidth: 2, stroke: "white", fill: "#00CFB7" }}
              />
            </AreaChart>

          </ResponsiveContainer>
        </div>
        <div className="graph-metrics">
          <div className="graph-metrics-header">
            <span className="metric-date">
              {hoveredData ? new Date(hoveredData.date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }) : "Total"}
            </span>
          </div>

          {[
            { title: "Revenue", key: "revenue", totalValue: totalRevenue, className: "" },
            { title: "Pending Revenue", key: "pendingRevenue", totalValue: pendingRevenue, className: "pending-revenue" },
            { title: "Subscriptions", key: "subscriptions", totalValue: totalSubscriberRevenue, className: "subscriber-revenue" },
          ].map(({ title, key, totalValue, className }) => {
            const latestEntry = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
            const latestValue = latestEntry ? Number(latestEntry[key as keyof LotEntry]) || 0 : 0;
            const hoveredValue = hoveredData && key in hoveredData
              ? Number(hoveredData[key as keyof typeof hoveredData]) || 0
              : null;

            const displayNumber = hoveredValue !== null ? hoveredValue.toFixed(2) : totalValue.toFixed(2);
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
  // Go back 7 days from current date
  prev.setDate(prev.getDate() - 7);
  return prev;
};

const getPreviousMonth = (date: Date): Date => {
  const prev = new Date(date);
  // Set to first day of current month
  prev.setDate(1);
  // Go back one month
  prev.setMonth(prev.getMonth() - 1);
  return prev;
};

const getPreviousYear = (date: Date): Date => {
  const prev = new Date(date);
  // Set to first day of current year
  prev.setMonth(0);
  prev.setDate(1);
  // Go back one year
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
