// d:\CodeApp\CVision\frontend_new\utils\formatters.ts

export const formatTime = (dateString: string, options?: { short?: boolean }) => {
  if (!dateString) return options?.short ? "bây giờ" : "Bây giờ";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return options?.short ? "vừa xong" : "Vừa xong";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return options?.short ? `${diffInMinutes}p` : `${diffInMinutes} phút trước`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return options?.short ? `${diffInHours}h` : `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return options?.short ? `${diffInDays} ngày` : `${diffInDays} ngày trước`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return options?.short ? `${diffInMonths} tháng` : `${diffInMonths} tháng trước`;
    const diffInYears = Math.floor(diffInMonths / 12);
    return options?.short ? `${diffInYears} năm` : `${diffInYears} năm trước`;
  } catch {
    return dateString;
  }
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
