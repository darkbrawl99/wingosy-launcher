use iced::widget::{button, column, container, row, scrollable, text, text_input, Column, Row};
use iced::{Application, Command, Element, Length, Theme};

use crate::config::AppConfig;
use crate::database::Database;
use crate::models::{Game, GameFilter, Platform};

pub struct App {
    config: AppConfig,
    db: Option<Database>,
    view: View,
    games: Vec<Game>,
    platforms: Vec<Platform>,
    selected_platform: Option<String>,
    selected_game: Option<i64>,
    search_query: String,
    error_message: Option<String>,
    is_loading: bool,
}

#[derive(Debug, Clone)]
pub enum Message {
    Loaded(Result<LoadedData, String>),
    SelectPlatform(Option<String>),
    SelectGame(i64),
    LaunchGame(i64),
    GameLaunched(Result<(), String>),
    ToggleFavorite(i64),
    FavoriteToggled(Result<(), String>),
    SearchChanged(String),
    NavigateTo(View),
    RefreshLibrary,
    LibraryRefreshed(Result<Vec<Game>, String>),
    OpenSettings,
    CloseError,
}

#[derive(Debug, Clone, PartialEq)]
pub enum View {
    Library,
    GameDetails(i64),
    Settings,
    Downloads,
    Setup,
}

#[derive(Debug, Clone)]
pub struct LoadedData {
    pub games: Vec<Game>,
    pub platforms: Vec<Platform>,
}

impl Application for App {
    type Executor = iced::executor::Default;
    type Message = Message;
    type Theme = Theme;
    type Flags = ();

    fn new(_flags: ()) -> (Self, Command<Message>) {
        let app = Self {
            config: AppConfig::default(),
            db: None,
            view: View::Library,
            games: Vec::new(),
            platforms: Vec::new(),
            selected_platform: None,
            selected_game: None,
            search_query: String::new(),
            error_message: None,
            is_loading: true,
        };

        let command = Command::perform(Self::load_initial_data(), Message::Loaded);

        (app, command)
    }

    fn title(&self) -> String {
        String::from("Wingosy Launcher")
    }

    fn theme(&self) -> Theme {
        Theme::Dark
    }

    fn update(&mut self, message: Message) -> Command<Message> {
        match message {
            Message::Loaded(result) => {
                self.is_loading = false;
                match result {
                    Ok(data) => {
                        self.games = data.games;
                        self.platforms = data.platforms;

                        if let Ok(db) = Database::open() {
                            self.db = Some(db);
                        }

                        if let Ok(config) = AppConfig::load() {
                            self.config = config;
                        }
                    }
                    Err(e) => {
                        self.error_message = Some(e);
                    }
                }
            }

            Message::SelectPlatform(platform_id) => {
                self.selected_platform = platform_id;
            }

            Message::SelectGame(game_id) => {
                self.selected_game = Some(game_id);
                self.view = View::GameDetails(game_id);
            }

            Message::LaunchGame(game_id) => {
                if let Some(game) = self.games.iter().find(|g| g.id == game_id) {
                    tracing::info!("Launching game: {}", game.name);
                }
            }

            Message::GameLaunched(result) => {
                if let Err(e) = result {
                    self.error_message = Some(e);
                }
            }

            Message::ToggleFavorite(game_id) => {
                if let Some(db) = &self.db {
                    if let Some(game) = self.games.iter_mut().find(|g| g.id == game_id) {
                        game.is_favorite = !game.is_favorite;
                        let _ = db.set_favorite(game_id, game.is_favorite);
                    }
                }
            }

            Message::FavoriteToggled(result) => {
                if let Err(e) = result {
                    self.error_message = Some(e);
                }
            }

            Message::SearchChanged(query) => {
                self.search_query = query;
            }

            Message::NavigateTo(view) => {
                self.view = view;
            }

            Message::RefreshLibrary => {
                self.is_loading = true;
            }

            Message::LibraryRefreshed(result) => {
                self.is_loading = false;
                match result {
                    Ok(games) => {
                        self.games = games;
                    }
                    Err(e) => {
                        self.error_message = Some(e);
                    }
                }
            }

            Message::OpenSettings => {
                self.view = View::Settings;
            }

            Message::CloseError => {
                self.error_message = None;
            }
        }

        Command::none()
    }

    fn view(&self) -> Element<Message> {
        let sidebar = self.view_sidebar();
        let content = match &self.view {
            View::Library => self.view_library(),
            View::GameDetails(game_id) => self.view_game_details(*game_id),
            View::Settings => self.view_settings(),
            View::Downloads => self.view_downloads(),
            View::Setup => self.view_setup(),
        };

        let main_content = row![sidebar, content].spacing(0);

        let mut page: Column<Message> = column![main_content];

        if let Some(error) = &self.error_message {
            let error_banner = container(
                row![
                    text(error).style(iced::theme::Text::Color(iced::Color::from_rgb(
                        1.0, 0.3, 0.3
                    ))),
                    button("×").on_press(Message::CloseError)
                ]
                .spacing(10),
            )
            .padding(10)
            .style(iced::theme::Container::Custom(Box::new(ErrorBannerStyle)));

            page = column![error_banner, main_content];
        }

        container(page)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }
}

impl App {
    async fn load_initial_data() -> Result<LoadedData, String> {
        let db = Database::open().map_err(|e| e.to_string())?;

        if db.get_all_platforms().map_err(|e| e.to_string())?.is_empty() {
            db.initialize_default_platforms()
                .map_err(|e| e.to_string())?;
        }

        let games = db.get_all_games().map_err(|e| e.to_string())?;
        let platforms = db.get_all_platforms().map_err(|e| e.to_string())?;

        Ok(LoadedData { games, platforms })
    }

    fn view_sidebar(&self) -> Element<Message> {
        let title = text("Wingosy").size(24);

        let all_games = button(text("All Games"))
            .on_press(Message::SelectPlatform(None))
            .width(Length::Fill);

        let favorites = button(text("Favorites"))
            .on_press(Message::NavigateTo(View::Library))
            .width(Length::Fill);

        let mut platform_buttons: Vec<Element<Message>> = Vec::new();
        for platform in &self.platforms {
            let btn = button(text(&platform.name))
                .on_press(Message::SelectPlatform(Some(platform.id.clone())))
                .width(Length::Fill);
            platform_buttons.push(btn.into());
        }

        let platforms_list = Column::with_children(platform_buttons).spacing(5);

        let settings = button(text("Settings"))
            .on_press(Message::OpenSettings)
            .width(Length::Fill);

        let content = column![
            title,
            all_games,
            favorites,
            text("Platforms").size(14),
            scrollable(platforms_list).height(Length::FillPortion(1)),
            settings,
        ]
        .spacing(10)
        .padding(15)
        .width(Length::Fixed(200.0));

        container(content)
            .height(Length::Fill)
            .style(iced::theme::Container::Custom(Box::new(SidebarStyle)))
            .into()
    }

    fn view_library(&self) -> Element<Message> {
        let search = text_input("Search games...", &self.search_query)
            .on_input(Message::SearchChanged)
            .padding(10)
            .width(Length::Fixed(300.0));

        let header = row![search].spacing(10).padding(10);

        let filtered_games: Vec<&Game> = self
            .games
            .iter()
            .filter(|g| {
                if let Some(ref platform) = self.selected_platform {
                    if &g.platform_id != platform {
                        return false;
                    }
                }

                if !self.search_query.is_empty() {
                    if !g
                        .name
                        .to_lowercase()
                        .contains(&self.search_query.to_lowercase())
                    {
                        return false;
                    }
                }

                true
            })
            .collect();

        let game_cards: Vec<Element<Message>> = filtered_games
            .iter()
            .map(|game| self.view_game_card(game))
            .collect();

        let games_grid = if game_cards.is_empty() {
            container(
                text("No games found. Add ROMs to your library or sync with RomM.")
                    .size(16)
            )
            .center_x()
            .center_y()
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
        } else {
            let rows: Vec<Element<Message>> = game_cards
                .chunks(5)
                .map(|chunk| {
                    Row::with_children(chunk.to_vec())
                        .spacing(15)
                        .into()
                })
                .collect();

            scrollable(Column::with_children(rows).spacing(15).padding(15))
                .width(Length::Fill)
                .height(Length::Fill)
                .into()
        };

        column![header, games_grid]
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }

    fn view_game_card(&self, game: &Game) -> Element<Message> {
        let name = text(&game.name).size(14);

        let platform = text(&game.platform_id)
            .size(10)
            .style(iced::theme::Text::Color(iced::Color::from_rgb(
                0.6, 0.6, 0.6,
            )));

        let favorite_icon = if game.is_favorite { "★" } else { "☆" };

        let content = column![name, platform, text(favorite_icon)]
            .spacing(5)
            .padding(10);

        button(content)
            .on_press(Message::SelectGame(game.id))
            .width(Length::Fixed(150.0))
            .into()
    }

    fn view_game_details(&self, game_id: i64) -> Element<Message> {
        let game = match self.games.iter().find(|g| g.id == game_id) {
            Some(g) => g,
            None => {
                return container(text("Game not found"))
                    .width(Length::Fill)
                    .height(Length::Fill)
                    .into();
            }
        };

        let title = text(&game.name).size(32);

        let platform_name = self
            .platforms
            .iter()
            .find(|p| p.id == game.platform_id)
            .map(|p| p.name.as_str())
            .unwrap_or(&game.platform_id);

        let platform = text(platform_name).size(16);

        let play_button = button(text("Play").size(16))
            .on_press(Message::LaunchGame(game.id))
            .padding(15);

        let favorite_text = if game.is_favorite {
            "Remove from Favorites"
        } else {
            "Add to Favorites"
        };
        let favorite_button =
            button(text(favorite_text)).on_press(Message::ToggleFavorite(game.id));

        let back_button = button(text("← Back")).on_press(Message::NavigateTo(View::Library));

        let summary = game
            .summary
            .as_ref()
            .map(|s| text(s).size(14))
            .unwrap_or_else(|| text("No description available.").size(14));

        let stats = column![
            text(format!("Play time: {}", game.formatted_play_time())).size(12),
            text(format!("Times played: {}", game.play_count)).size(12),
        ]
        .spacing(5);

        let content = column![
            back_button,
            title,
            platform,
            row![play_button, favorite_button].spacing(10),
            summary,
            stats,
        ]
        .spacing(20)
        .padding(30);

        container(scrollable(content))
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }

    fn view_settings(&self) -> Element<Message> {
        let title = text("Settings").size(28);

        let back_button = button(text("← Back")).on_press(Message::NavigateTo(View::Library));

        let romm_section = column![
            text("RomM Server").size(18),
            text("Configure your RomM server connection").size(12),
        ]
        .spacing(5);

        let emulators_section = column![
            text("Emulators").size(18),
            text("Configure emulator paths and preferences").size(12),
        ]
        .spacing(5);

        let library_section = column![
            text("Library").size(18),
            text("Manage ROM directories and scanning").size(12),
        ]
        .spacing(5);

        let content = column![
            back_button,
            title,
            romm_section,
            emulators_section,
            library_section,
        ]
        .spacing(20)
        .padding(30);

        container(scrollable(content))
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }

    fn view_downloads(&self) -> Element<Message> {
        let title = text("Downloads").size(28);

        let content = column![title, text("No active downloads").size(14),]
            .spacing(20)
            .padding(30);

        container(content)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }

    fn view_setup(&self) -> Element<Message> {
        let title = text("Welcome to Wingosy").size(32);

        let subtitle = text("Let's get you set up").size(18);

        let content = column![title, subtitle,]
            .spacing(20)
            .padding(30)
            .align_items(iced::Alignment::Center);

        container(content)
            .width(Length::Fill)
            .height(Length::Fill)
            .center_x()
            .center_y()
            .into()
    }
}

struct SidebarStyle;

impl iced::widget::container::StyleSheet for SidebarStyle {
    type Style = Theme;

    fn appearance(&self, _style: &Self::Style) -> iced::widget::container::Appearance {
        iced::widget::container::Appearance {
            background: Some(iced::Background::Color(iced::Color::from_rgb(
                0.12, 0.12, 0.14,
            ))),
            border: iced::Border::default(),
            ..Default::default()
        }
    }
}

struct ErrorBannerStyle;

impl iced::widget::container::StyleSheet for ErrorBannerStyle {
    type Style = Theme;

    fn appearance(&self, _style: &Self::Style) -> iced::widget::container::Appearance {
        iced::widget::container::Appearance {
            background: Some(iced::Background::Color(iced::Color::from_rgb(
                0.3, 0.1, 0.1,
            ))),
            border: iced::Border::default(),
            ..Default::default()
        }
    }
}
