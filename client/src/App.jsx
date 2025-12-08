import { Routes, Route, Link } from "react-router-dom";
import DashboardCards from "./components/DashboardCards.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import CouponsPage from "./pages/CouponsPage.jsx";  

export default function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "20px" }}>
      <header style={{ marginBottom: "20px" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <h1>JSONBin Mini Admin</h1>
        </Link>
      </header>

      <Routes>
        <Route path="/" element={<DashboardCards />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/coupons" element={<CouponsPage />} /> 
      </Routes>
    </div>
  );
}
