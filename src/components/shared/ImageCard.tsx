import { Box, Typography, IconButton } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { Visibility } from "@mui/icons-material";
import Swal from "sweetalert2"; // ✅ Import SweetAlert
import { useAuth } from "@/store/AuthContext/AuthContext";

interface ImageCardProps {
  image: string;
  title: string;
  price: number;
  isFirst: boolean;
  gridStyles?: any;
  roomId?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (roomId: string) => void;
  onClick?: () => void;
}

const ImageCard = ({
  image,
  title,
  price,
  isFirst,
  gridStyles = {},
  roomId = "",
  isFavorite = false,
  onToggleFavorite = () => {},
  onClick,
}: ImageCardProps) => {

  // Check for token to confirm login
  

  return (
    <Box
      sx={{
        ...gridStyles,
        position: "relative",
        borderRadius: 5,
        overflow: "hidden",
        height: { xs: 250, sm: isFirst ? 400 : 250, md: isFirst ? 512 : 250 },
        width: "100%",
        cursor: "pointer",
        "&:hover .overlay": {
          transform: "translateY(0%)",
          opacity: 1,
        },
      }}
    >
      <img
        src={image || "/fallback.jpg"}
        alt={title}
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/fallback.jpg";
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          backgroundColor: "#ff4081",
          color: "#fff",
          borderBottomLeftRadius: "15px",
          px: 1.5,
          py: 0.5,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        ${price}
        <span style={{ fontSize: 12 }}> per night</span>
      </Box>

      <Box
        className="overlay"
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "100%",
          bgcolor: "#183ad33b",
          transform: "translateY(0%)",
          opacity: 0,
          transition: "transform 0.6s ease, opacity 0.6s ease",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <IconButton
          sx={{ color: isFavorite ? "#ff1744" : "white", fontSize: 32 }}
        >
          <FavoriteIcon fontSize="inherit" />
        </IconButton>
        <IconButton onClick={onClick} sx={{ color: "white", fontSize: 32 }}>
          <Visibility fontSize="inherit" />
        </IconButton>
      </Box>

      <Box
        sx={{
          position: "absolute",
          bottom: 8,
          left: 8,
          color: "white",
          textShadow: "0 0 5px rgba(0,0,0,0.6)",
          fontSize: "40px",
        }}
      >
        <Typography fontWeight="bold">{title}</Typography>
        <Typography variant="body2">item location</Typography>
      </Box>
    </Box>
  );
};

export default ImageCard;
