use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: i64,
    pub name: String,
    pub is_smart: bool,
    pub smart_filter: Option<SmartFilter>,
    pub game_ids: Vec<i64>,
    pub cover_path: Option<String>,
    pub sort_order: i32,
}

impl Collection {
    pub fn new_manual(name: impl Into<String>) -> Self {
        Self {
            id: 0,
            name: name.into(),
            is_smart: false,
            smart_filter: None,
            game_ids: Vec::new(),
            cover_path: None,
            sort_order: 0,
        }
    }

    pub fn new_smart(name: impl Into<String>, filter: SmartFilter) -> Self {
        Self {
            id: 0,
            name: name.into(),
            is_smart: true,
            smart_filter: Some(filter),
            game_ids: Vec::new(),
            cover_path: None,
            sort_order: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartFilter {
    pub filter_type: SmartFilterType,
    pub limit: Option<i32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SmartFilterType {
    RecentlyPlayed,
    MostPlayed,
    TopUnplayed,
    RecentlyAdded,
    Favorites,
    HighRated,
    NeverPlayed,
}

pub fn default_smart_collections() -> Vec<Collection> {
    vec![
        Collection::new_smart(
            "Recently Played",
            SmartFilter {
                filter_type: SmartFilterType::RecentlyPlayed,
                limit: Some(20),
            },
        ),
        Collection::new_smart(
            "Most Played",
            SmartFilter {
                filter_type: SmartFilterType::MostPlayed,
                limit: Some(20),
            },
        ),
        Collection::new_smart(
            "Top Unplayed",
            SmartFilter {
                filter_type: SmartFilterType::TopUnplayed,
                limit: Some(20),
            },
        ),
        Collection::new_smart(
            "Recently Added",
            SmartFilter {
                filter_type: SmartFilterType::RecentlyAdded,
                limit: Some(20),
            },
        ),
        Collection::new_smart(
            "Favorites",
            SmartFilter {
                filter_type: SmartFilterType::Favorites,
                limit: None,
            },
        ),
    ]
}
