import re

def normalize_skill_name(skill: str) -> str:
    """Chuẩn hóa tên kỹ năng (ví dụ: ReactJS -> React)."""
    skill = skill.lower().strip()
    mapping = {
        "reactjs": "React",
        "react.js": "React",
        "nodejs": "Node.js",
        "node js": "Node.js",
        "python3": "Python"
    }
    return mapping.get(skill, skill.capitalize())

def format_currency(amount: float, currency: str = "VND") -> str:
    """Định dạng hiển thị tiền tệ."""
    if currency == "VND":
        return f"{amount:,.0f} đ"
    return f"{amount:,.2f} {currency}"