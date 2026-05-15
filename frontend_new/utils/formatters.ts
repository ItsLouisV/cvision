import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

// Cấu hình dayjs để dùng tiếng Việt và tính năng relative time
dayjs.extend(relativeTime);
dayjs.locale("vi");

export const formatTime = (dateString: string, options?: { short?: boolean }) => {
  if (!dateString) return options?.short ? "vừa xong" : "Vừa xong";
  
  const date = dayjs(dateString);
  
  if (options?.short) {
    const diffInMinutes = dayjs().diff(date, "minute");
    if (diffInMinutes < 1) return "vừa xong";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = dayjs().diff(date, "hour");
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = dayjs().diff(date, "day");
    if (diffInDays < 30) return `${diffInDays}d`;
    
    return date.format("DD/MM");
  }

  return date.fromNow();
};

export const formatSalary = (
  from: number | null,
  to: number | null,
  currency: string = "VNĐ",
  unit: string = "month",
) => {
  if (!from && !to) return "Thỏa thuận";
  if (unit === "negotiable") return "Thỏa thuận";

  const isVND =
    currency.toUpperCase() === "VNĐ" || currency.toUpperCase() === "VND";
  const isUSD = currency.toUpperCase() === "USD";
  const isHourly = unit.toLowerCase() === "hour";

  let fStr = "";
  let tStr = "";

  if (isVND) {
    if (isHourly) {
      // Tiền lương theo giờ (VND): Giữ nguyên số gốc, thêm dấu ngăn cách phần nghìn.
      fStr = from ? from.toLocaleString() : "?";
      tStr = to ? to.toLocaleString() : "?";
    } else {
      // Tiền lương theo tháng/năm (VND): Chia cho 1,000,000 để lấy đơn vị "triệu"
      fStr = from ? (from / 1000000).toFixed(0) : "?";
      tStr = to ? (to / 1000000).toFixed(0) : "?";
    }
  } else {
    // Ngoại tệ: Luôn giữ nguyên số gốc và thêm dấu phẩy ngăn cách phần nghìn
    fStr = from
      ? from.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        })
      : "?";
    tStr = to
      ? to.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        })
      : "?";
  }

  // Nối chuỗi tiền tệ (Nếu là VND thì mượn chữ 'triệu', USD thì giữ nguyên số gốc)
  let salaryText = "";
  if (isVND) {
    salaryText = isHourly
      ? `${fStr} - ${tStr} VNĐ`
      : `${fStr} - ${tStr} triệu`;
  } else if (isUSD) {
    salaryText = `$${fStr} - $${tStr}`;
  } else {
    salaryText = `${fStr} - ${tStr} ${currency}`;
  }

  // Nối Đơn vị tính
  const unitMap: any = {
    hour: "/ giờ",
    month: "/ tháng",
    year: "/ năm",
    day: "/ ngày",
    project: "/ dự án",
  };

  const unitText = unitMap[unit] || "";
  return `${salaryText} ${unitText}`.trim();
};
