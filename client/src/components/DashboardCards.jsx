import { useNavigate } from "react-router-dom";

const cards = [
  { key: "users", title: "Users", description: "Manage all users" },
  { key: "categories", title: "Categories", description: "Manage product categories" },
  { key: "products", title: "Products", description: "Manage all products" },
  { key: "orders", title: "Orders", description: "View and manage orders" },
  { key: "coupons", title: "Coupons", description: "Manage discount coupons" }
];

export default function DashboardCards() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px"
      }}
    >
      {cards.map((card) => (
        <div
          key={card.key}
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "16px",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}
          onClick={() => navigate(`/${card.key}`)}
        >
          <h2>{card.title}</h2>
          <p style={{ fontSize: "14px", color: "#555" }}>{card.description}</p>
        </div>
      ))}
    </div>
  );
}
