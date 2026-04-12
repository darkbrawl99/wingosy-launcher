import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ScreenshotLightbox from "./ScreenshotLightbox";

/**
 * Horizontal strip + opens Argosy-style full-screen viewer on click.
 * When RomM returns no screenshot URLs, the section still shows with an empty-state hint.
 */
export default function GameScreenshotsSection({ urls, getMediaSrc, isRommGame = true }) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (list.length === 0) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
          Screenshots
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {isRommGame ? (
            <>
              <strong>No screenshots.</strong> Many titles never get screenshot URLs from RomM or IGDB—that
              is normal. If you expect artwork, try <strong>Refresh game data</strong> from the game menu, or
              sync under <strong>Settings</strong> → <strong>RomM</strong> (Sync library). Otherwise nothing is
              wrong.
            </>
          ) : (
            <>
              Screenshots here come from RomM metadata. Games added only from a local folder don’t have a
              RomM gallery yet.
            </>
          )}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
        Screenshots
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          overflowX: "auto",
          pb: 1,
          "& img": {
            borderRadius: 2,
            maxHeight: 180,
            width: "auto",
            objectFit: "cover",
            flexShrink: 0,
            bgcolor: "action.hover",
            cursor: "pointer",
            transition: "transform 0.15s",
            "&:hover": { transform: "scale(1.02)" },
          },
        }}
      >
        {list.map((url, i) => {
          const src = getMediaSrc(url);
          if (!src) return null;
          return (
            <Box
              key={url}
              component="img"
              src={src}
              alt=""
              loading="lazy"
              onClick={() => {
                setLightboxIndex(i);
                setLightboxOpen(true);
              }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          );
        })}
      </Box>

      <ScreenshotLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        urls={list}
        getSrc={getMediaSrc}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </Box>
  );
}
