import MoreVertIcon from "@mui/icons-material/MoreVert";
import { Box, IconButton, Menu } from "@mui/material";
import React from "react";

const ITEM_HEIGHT = 48;

export default function CustomMenu({ items }: { items: React.ReactNode[] }) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  return (
    <>
      <IconButton
        aria-label="more"
        id="long-button"
        aria-controls={open ? "long-menu" : undefined}
        aria-expanded={open ? "true" : undefined}
        aria-haspopup="true"
        onClick={handleClick}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="long-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            style: {
              maxHeight: ITEM_HEIGHT * 4.5,
            },
          },
          list: {
            "aria-labelledby": "long-button",
          },
        }}
      >
        {items.map((item, index) => (
          <Box key={index} onClick={handleClose}>
            {item}
          </Box>
        ))}
      </Menu>
    </>
  );
}
