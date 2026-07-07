// Icon per relationship kind — the third leg of the Color / Icon / Label trio.
// Kept in a .tsx next to the graph (the apiGraph lib stays framework-free).

import type { SvgIconComponent } from "@mui/icons-material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import type { RelationKind } from "@/lib/apiGraph";

export const RELATION_ICON: Record<RelationKind, SvgIconComponent> = {
  authentication: LockOutlinedIcon,
  "business-flow": AccountTreeOutlinedIcon,
  "data-dependency": StorageOutlinedIcon,
  trigger: BoltOutlinedIcon,
  related: LinkOutlinedIcon,
  deprecated: BlockOutlinedIcon,
};
