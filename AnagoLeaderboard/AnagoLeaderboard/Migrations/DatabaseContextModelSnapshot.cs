﻿// <auto-generated />
using System;
using AnagoLeaderboard.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#nullable disable

namespace AnagoLeaderboard.Migrations
{
    [DbContext(typeof(DatabaseContext))]
    partial class DatabaseContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder.HasAnnotation("ProductVersion", "8.0.10");

            modelBuilder.Entity("AnagoLeaderboard.Models.Results.Game", b =>
                {
                    b.Property<string>("Id")
                        .HasColumnType("TEXT");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.ToTable("Games");
                });

            modelBuilder.Entity("AnagoLeaderboard.Models.Results.Player", b =>
                {
                    b.Property<string>("Id")
                        .HasColumnType("TEXT");

                    b.Property<bool>("Active")
                        .HasColumnType("INTEGER");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("TEXT");

                    b.Property<int>("GoalsAgainst")
                        .HasColumnType("INTEGER");

                    b.Property<int>("GoalsFor")
                        .HasColumnType("INTEGER");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int>("NumberOfGames")
                        .HasColumnType("INTEGER");

                    b.Property<int>("NumberOfLosses")
                        .HasColumnType("INTEGER");

                    b.Property<int>("NumberOfWins")
                        .HasColumnType("INTEGER");

                    b.Property<int>("Rating")
                        .HasColumnType("INTEGER");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.ToTable("Players");
                });

            modelBuilder.Entity("AnagoLeaderboard.Models.Results.Game", b =>
                {
                    b.OwnsOne("AnagoLeaderboard.Models.Results.TeamPerformance", "FirstTeam", b1 =>
                        {
                            b1.Property<string>("GameId")
                                .HasColumnType("TEXT");

                            b1.Property<int>("Goals")
                                .HasColumnType("INTEGER");

                            b1.HasKey("GameId");

                            b1.ToTable("Games");

                            b1.WithOwner()
                                .HasForeignKey("GameId");

                            b1.OwnsOne("AnagoLeaderboard.Models.Results.PlayerPerformance", "FirstPlayer", b2 =>
                                {
                                    b2.Property<string>("TeamPerformanceGameId")
                                        .HasColumnType("TEXT");

                                    b2.Property<string>("Name")
                                        .HasColumnType("TEXT");

                                    b2.Property<int>("NewRating")
                                        .HasColumnType("INTEGER");

                                    b2.Property<int>("OldRating")
                                        .HasColumnType("INTEGER");

                                    b2.Property<string>("PlayerId")
                                        .IsRequired()
                                        .HasColumnType("TEXT");

                                    b2.HasKey("TeamPerformanceGameId");

                                    b2.ToTable("Games");

                                    b2.WithOwner()
                                        .HasForeignKey("TeamPerformanceGameId");
                                });

                            b1.OwnsOne("AnagoLeaderboard.Models.Results.PlayerPerformance", "SecondPlayer", b2 =>
                                {
                                    b2.Property<string>("TeamPerformanceGameId")
                                        .HasColumnType("TEXT");

                                    b2.Property<string>("Name")
                                        .HasColumnType("TEXT");

                                    b2.Property<int>("NewRating")
                                        .HasColumnType("INTEGER");

                                    b2.Property<int>("OldRating")
                                        .HasColumnType("INTEGER");

                                    b2.Property<string>("PlayerId")
                                        .IsRequired()
                                        .HasColumnType("TEXT");

                                    b2.HasKey("TeamPerformanceGameId");

                                    b2.ToTable("Games");

                                    b2.WithOwner()
                                        .HasForeignKey("TeamPerformanceGameId");
                                });

                            b1.Navigation("FirstPlayer")
                                .IsRequired();

                            b1.Navigation("SecondPlayer")
                                .IsRequired();
                        });

                    b.OwnsOne("AnagoLeaderboard.Models.Results.TeamPerformance", "SecondTeam", b1 =>
                        {
                            b1.Property<string>("GameId")
                                .HasColumnType("TEXT");

                            b1.Property<int>("Goals")
                                .HasColumnType("INTEGER");

                            b1.HasKey("GameId");

                            b1.ToTable("Games");

                            b1.WithOwner()
                                .HasForeignKey("GameId");

                            b1.OwnsOne("AnagoLeaderboard.Models.Results.PlayerPerformance", "FirstPlayer", b2 =>
                                {
                                    b2.Property<string>("TeamPerformanceGameId")
                                        .HasColumnType("TEXT");

                                    b2.Property<string>("Name")
                                        .HasColumnType("TEXT");

                                    b2.Property<int>("NewRating")
                                        .HasColumnType("INTEGER");

                                    b2.Property<int>("OldRating")
                                        .HasColumnType("INTEGER");

                                    b2.Property<string>("PlayerId")
                                        .IsRequired()
                                        .HasColumnType("TEXT");

                                    b2.HasKey("TeamPerformanceGameId");

                                    b2.ToTable("Games");

                                    b2.WithOwner()
                                        .HasForeignKey("TeamPerformanceGameId");
                                });

                            b1.OwnsOne("AnagoLeaderboard.Models.Results.PlayerPerformance", "SecondPlayer", b2 =>
                                {
                                    b2.Property<string>("TeamPerformanceGameId")
                                        .HasColumnType("TEXT");

                                    b2.Property<string>("Name")
                                        .HasColumnType("TEXT");

                                    b2.Property<int>("NewRating")
                                        .HasColumnType("INTEGER");

                                    b2.Property<int>("OldRating")
                                        .HasColumnType("INTEGER");

                                    b2.Property<string>("PlayerId")
                                        .IsRequired()
                                        .HasColumnType("TEXT");

                                    b2.HasKey("TeamPerformanceGameId");

                                    b2.ToTable("Games");

                                    b2.WithOwner()
                                        .HasForeignKey("TeamPerformanceGameId");
                                });

                            b1.Navigation("FirstPlayer")
                                .IsRequired();

                            b1.Navigation("SecondPlayer")
                                .IsRequired();
                        });

                    b.Navigation("FirstTeam")
                        .IsRequired();

                    b.Navigation("SecondTeam")
                        .IsRequired();
                });
#pragma warning restore 612, 618
        }
    }
}
